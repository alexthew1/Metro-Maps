package __PACKAGE__

import android.content.ComponentCallbacks2
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.RectF
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.*
import com.facebook.react.common.LifecycleState
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.google.android.gms.maps.*
import com.google.android.gms.maps.model.*
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.abs

private data class NativeRoute(val index: Int, val id: String, val points: List<MapPoint>, val time: String,
    val distance: String, val mode: String, val color: String, val traffic: JSONArray)
private data class MarkerTag(val kind: String, val id: String = "", val index: Int = -1)
private data class TrafficLine(val line: Polyline, val start: Int, val end: Int)
private class MetroMapEvent(surface: Int, tag: Int, private val payload: WritableMap) : Event<MetroMapEvent>(surface, tag) {
    override fun getEventName() = "topMapEvent"
    override fun getEventData() = payload
    override fun canCoalesce() = false
}

class MetroMapManager : SimpleViewManager<MetroMapView>() {
    override fun getName() = "MetroMap"
    override fun createViewInstance(context: ThemedReactContext) = MetroMapView(context)
    @ReactProp(name = "scene") fun setScene(view: MetroMapView, value: String?) { view.setScene(value) }
    @ReactProp(name = "options") fun setOptions(view: MetroMapView, value: String?) { view.setOptions(value) }
    @ReactProp(name = "location") fun setLocation(view: MetroMapView, value: String?) { view.setLocation(value) }
    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        mutableMapOf("topMapEvent" to mapOf("registrationName" to "onMapEvent"))
    override fun onAfterUpdateTransaction(view: MetroMapView) { super.onAfterUpdateTransaction(view); view.ensureMap() }
    override fun onDropViewInstance(view: MetroMapView) { view.destroy(); super.onDropViewInstance(view) }
}

class MetroMapView(private val react: ThemedReactContext) : FrameLayout(react), LifecycleEventListener, ComponentCallbacks2 {
    private var mapView: MapView? = null
    private var map: GoogleMap? = null
    private val icons = MetroMapIcons(react)
    private var options = JSONObject()
    private var scene = JSONObject()
    private var sceneText: String? = null
    private var optionsText: String? = null
    private var styleText = ""
    private var routes = listOf<NativeRoute>()
    private val places = mutableMapOf<String, Marker>()
    private val lines = mutableListOf<Polyline>()
    private val selectedLines = mutableListOf<Polyline>()
    private val trafficLines = mutableListOf<TrafficLine>()
    private val labels = mutableListOf<Pair<NativeRoute, Marker>>()
    private var origin: Marker? = null
    private var userMarker: Marker? = null
    private var location: MapPoint? = null
    private var heading = 0f
    private var progressIndex = 0
    private var progressRoute = ""
    private var cameraKey = ""
    private var pendingFit = false
    private var initializedCamera = false
    private var gestureSuspended = false
    private var navigationZoom = 18.5f
    private var locateTrigger = 0
    private var destroyed = false
    private var resumed = false
    private var started = false
    private val zoomPanel = LinearLayout(react).apply { orientation = LinearLayout.VERTICAL }
    private val zoomButtons = mutableListOf<TextView>()
    private val navigating get() = options.optString("mode") == "navigation"
    private val following get() = options.optBoolean("following", true) && !gestureSuspended
    private val selectedRoute get() = routes.find { it.index == scene.optInt("selectedRouteIndex", 0) }
    private fun dp(value: Float) = value * resources.displayMetrics.density
    private fun point(json: JSONObject?): MapPoint? {
        if (json == null) return null
        val lat = json.optDouble("latitude", Double.NaN); val lon = json.optDouble("longitude", Double.NaN)
        return if (lat.isFinite() && lon.isFinite() && abs(lat) <= 90 && abs(lon) <= 180) MapPoint(lat, lon) else null
    }
    private fun latLng(point: MapPoint) = LatLng(point.latitude, point.longitude)
    private fun points(array: JSONArray?): List<MapPoint> = if (array == null) emptyList() else (0 until array.length()).mapNotNull { point(array.optJSONObject(it)) }
    private fun color(value: String, fallback: Int): Int = try { Color.parseColor(value) } catch (_: IllegalArgumentException) { fallback }
    private fun emit(kind: String, fill: WritableMap.() -> Unit = {}) {
        if (destroyed || id == View.NO_ID) return
        val payload = Arguments.createMap().apply { putString("kind", kind); fill() }
        UIManagerHelper.getEventDispatcherForReactTag(react, id)?.dispatchEvent(MetroMapEvent(UIManagerHelper.getSurfaceId(this), id, payload))
    }

    init {
        addView(zoomPanel, LayoutParams(dp(48f).toInt(), dp(104f).toInt(), Gravity.END or Gravity.CENTER_VERTICAL).apply { rightMargin = dp(18f).toInt() })
        for (direction in listOf(1, -1)) {
            val button = TextView(react).apply {
                text = if (direction == 1) "+" else "−"; textSize = 26f; gravity = Gravity.CENTER
                contentDescription = if (direction == 1) "Zoom in" else "Zoom out"
                isClickable = true; isFocusable = true; elevation = dp(3f)
                setOnClickListener {
                    map?.let { google ->
                        val zoom = (google.cameraPosition.zoom + direction).coerceIn(google.minZoomLevel, google.maxZoomLevel)
                        if (navigating) navigationZoom = zoom
                        google.animateCamera(CameraUpdateFactory.zoomTo(zoom), 250, null)
                    }
                }
            }
            zoomButtons.add(button)
            zoomPanel.addView(button, LinearLayout.LayoutParams(dp(48f).toInt(), dp(48f).toInt()).apply { if (direction == -1) topMargin = dp(8f).toInt() })
        }
        zoomPanel.visibility = View.GONE
        react.addLifecycleEventListener(this)
        react.applicationContext.registerComponentCallbacks(this)
    }

    fun ensureMap() {
        if (mapView != null || destroyed) return
        MapsInitializer.initialize(react, MapsInitializer.Renderer.LATEST, null)
        val mapOptions = GoogleMapOptions().compassEnabled(false).mapToolbarEnabled(false)
        options.optString("mapId").takeIf { it.isNotBlank() }?.let { mapOptions.mapId(it).mapColorScheme(if (options.optString("theme") == "dark") MapColorScheme.DARK else MapColorScheme.LIGHT) }
        val view = MapView(react, mapOptions)
        mapView = view
        addView(view, 0, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        view.onCreate(null)
        if (started) view.onStart()
        if (resumed) view.onResume()
        view.getMapAsync { google ->
            if (destroyed) return@getMapAsync
            map = google
            google.uiSettings.apply { isZoomControlsEnabled = false; isCompassEnabled = false; isMapToolbarEnabled = false }
            google.setOnMapClickListener { emit("mapPress") }
            google.setOnPoiClickListener { poi -> emit("placePress") { putString("placeId", poi.placeId); putString("name", poi.name); putDouble("latitude", poi.latLng.latitude); putDouble("longitude", poi.latLng.longitude) } }
            google.setOnMarkerClickListener { marker ->
                val tag = marker.tag as? MarkerTag
                when (tag?.kind) {
                    "route" -> if (!navigating) emit("routePress") { putInt("index", tag.index) }
                    "place" -> emit("placePress") { putString("placeId", tag.id) }
                }
                true
            }
            google.setOnPolylineClickListener { line -> if (!navigating) (line.tag as? Int)?.let { index -> emit("routePress") { putInt("index", index) } } }
            google.setOnCameraMoveStartedListener { reason -> if (reason == GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) { gestureSuspended = true; emit("gesture") } }
            google.setOnCameraIdleListener { placeLabels(); emitCamera() }
            applyOptions(); renderScene(); updateUser(); initializeCamera(); fitScene(); followUser()
        }
    }

    fun setScene(raw: String?) {
        if (raw == sceneText) return
        sceneText = raw
        scene = try { JSONObject(raw ?: "{}") } catch (_: Exception) { JSONObject() }
        val list = scene.optJSONArray("routes") ?: JSONArray()
        routes = (0 until list.length()).mapNotNull { i ->
            val value = list.optJSONObject(i) ?: return@mapNotNull null
            val geometry = points(value.optJSONArray("points"))
            if (geometry.size < 2) return@mapNotNull null
            NativeRoute(value.optInt("index", i), value.optString("id"), geometry, value.optString("time"), value.optString("distance"), value.optString("mode"), value.optString("transitColor"), value.optJSONArray("traffic") ?: JSONArray())
        }
        val key = scene.optString("cameraKey")
        if (key != cameraKey) { cameraKey = key; pendingFit = true }
        renderScene(); fitScene()
    }
    fun setOptions(raw: String?) {
        if (raw == optionsText) return
        optionsText = raw
        val previousTheme = options.optString("theme")
        val previousNavigation = navigating
        val previousFollowing = options.optBoolean("following", true)
        options = try { JSONObject(raw ?: "{}") } catch (_: Exception) { JSONObject() }
        if (!previousFollowing && options.optBoolean("following", true)) gestureSuspended = false
        applyOptions()
        if (previousNavigation != navigating) {
            progressIndex = 0; pendingFit = true; renderScene(); updateUser()
            if (!navigating) map?.let { google -> google.animateCamera(CameraUpdateFactory.newCameraPosition(CameraPosition.Builder(google.cameraPosition).tilt(0f).bearing(0f).zoom(15.5f).build())) }
        }
        initializeCamera(); fitScene()
        if (previousTheme != options.optString("theme") && previousNavigation == navigating) renderScene()
        val trigger = options.optInt("cameraTrigger", 0)
        if (trigger != locateTrigger) {
            locateTrigger = trigger
            location?.let { map?.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng(it), 15.5f), 600, null); initializedCamera = true }
        }
        followUser()
    }
    fun setLocation(raw: String?) {
        val value = try { JSONObject(raw ?: "{}") } catch (_: Exception) { null }
        location = point(value)
        val bearing = value?.optDouble("heading", -1.0) ?: -1.0
        if (bearing.isFinite() && bearing >= 0) heading = (bearing % 360).toFloat()
        updateUser(); updateProgress(); initializeCamera(); followUser()
    }
    private fun applyOptions() {
        val dark = options.optString("theme") == "dark"
        zoomPanel.visibility = if (options.optBoolean("zoomControls")) View.VISIBLE else View.GONE
        for (button in zoomButtons) {
            button.setTextColor(if (dark) Color.WHITE else Color.BLACK)
            button.background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(if (dark) Color.rgb(37, 52, 64) else Color.WHITE); setStroke(dp(1f).toInt().coerceAtLeast(1), if (dark) Color.rgb(64, 83, 96) else Color.rgb(215, 220, 224)) }
        }
        map?.let { google ->
            if (options.optString("mapId").isNotBlank()) google.setMapColorScheme(if (dark) MapColorScheme.DARK else MapColorScheme.LIGHT)
            google.mapType = if (options.optString("mapType") == "satellite") {
                if (options.optBoolean("showLabels", true)) GoogleMap.MAP_TYPE_HYBRID else GoogleMap.MAP_TYPE_SATELLITE
            } else GoogleMap.MAP_TYPE_NORMAL
            google.isBuildingsEnabled = options.optBoolean("buildings", true)
            val style = options.optJSONArray("style")?.toString() ?: "[]"
            if (options.optString("mapId").isBlank() && style != styleText) { styleText = style; google.setMapStyle(MapStyleOptions(style)) }
            val bottom = if (navigating) 135f else if (routes.isNotEmpty() || scene.optJSONArray("cameraPoints")?.length()?.let { it > 0 } == true) 260f else 80f
            google.setPadding(0, dp(options.optDouble("top", 0.0).toFloat() + if (navigating) 130f else 25f).toInt(), 0, dp(options.optDouble("bottom", 0.0).toFloat() + bottom).toInt())
        }
    }
    private fun renderScene() {
        val google = map ?: return
        applyOptions()
        lines.forEach { it.remove() }; lines.clear(); selectedLines.clear(); trafficLines.clear()
        labels.forEach { it.second.remove() }; labels.clear(); origin?.remove(); origin = null
        val chosen = selectedRoute
        if (chosen?.id != progressRoute) { progressRoute = chosen?.id ?: ""; progressIndex = 0 }
        for (route in routes) {
            val selected = route.index == chosen?.index
            if (navigating && !selected) continue
            val geometry = route.points.map(::latLng)
            fun line(width: Float, shade: Int, z: Float): Polyline = google.addPolyline(PolylineOptions().addAll(geometry).width(dp(width)).color(shade).zIndex(z).clickable(!navigating).startCap(RoundCap()).endCap(RoundCap()).jointType(JointType.ROUND)).also { it.tag = route.index; lines.add(it) }
            if (selected) {
                selectedLines.add(line(10f, Color.WHITE, 3f)); selectedLines.add(line(7f, Color.rgb(22, 87, 136), 4f))
                selectedLines.add(line(6f, if (route.mode == "transit") color(route.color, Color.rgb(0, 133, 208)) else Color.rgb(0, 137, 215), 5f))
                if (route.mode != "transit") for (i in 0 until route.traffic.length()) {
                    val interval = route.traffic.optJSONObject(i) ?: continue
                    val start = interval.optInt("startPolylinePointIndex", 0).coerceIn(0, geometry.lastIndex)
                    val end = interval.optInt("endPolylinePointIndex", geometry.lastIndex).coerceIn(start, geometry.lastIndex)
                    if (end <= start) continue
                    val shade = when (interval.optString("speed")) { "SLOW" -> Color.rgb(245, 166, 35); "TRAFFIC_JAM" -> Color.rgb(208, 2, 27); else -> Color.rgb(0, 137, 215) }
                    val overlay = google.addPolyline(PolylineOptions().addAll(geometry.subList(start, end + 1)).width(dp(6f)).color(shade).zIndex(6f).startCap(RoundCap()).endCap(RoundCap()))
                    lines.add(overlay); trafficLines.add(TrafficLine(overlay, start, end))
                }
                if (!navigating) origin = google.addMarker(MarkerOptions().position(geometry[0]).icon(icons.origin()).anchor(0.5f, 0.5f).zIndex(30f))
            } else line(5f, if (options.optString("theme") == "dark") Color.rgb(110, 134, 152) else Color.rgb(154, 171, 186), 1f)
            if (!navigating) MetroMapGeometry.atFraction(route.points, 0.5)?.let { midpoint ->
                google.addMarker(MarkerOptions().position(latLng(midpoint)).icon(icons.label(route.time, route.distance, selected)).anchor(0.5f, 63f / 64f).zIndex(if (selected) 50f else 40f))?.let { marker -> marker.tag = MarkerTag("route", index = route.index); labels.add(route to marker) }
            }
        }
        syncPlaces(); updateProgress(); placeLabels()
    }
    private fun syncPlaces() {
        val google = map ?: return
        val list = scene.optJSONArray("markers") ?: JSONArray()
        val active = mutableSetOf<String>()
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val position = point(item) ?: continue
            val key = item.optString("id"); if (key.isEmpty()) continue
            active.add(key)
            val selected = item.optBoolean("selected"); val saved = item.optBoolean("saved")
            val marker = places[key] ?: google.addMarker(MarkerOptions().position(latLng(position)).anchor(0.5f, 1f))?.also { places[key] = it } ?: continue
            marker.position = latLng(position); marker.title = item.optString("title")
            marker.zIndex = if (selected) 90f else if (saved) 80f else 25f
            marker.tag = MarkerTag("place", key)
        }
        for (key in places.keys.filter { !active.contains(it) }) { places.remove(key)?.remove() }
    }
    private fun updateProgress() {
        if (!navigating) return
        val chosen = selectedRoute ?: return
        val position = location ?: return
        val projection = MetroMapGeometry.project(position, chosen.points, progressIndex) ?: return
        if (projection.distance > 60.0) return
        progressIndex = projection.index
        val remaining = listOf(projection.point) + chosen.points.drop(progressIndex + 1)
        selectedLines.forEach { it.points = remaining.map(::latLng) }
        for (segment in trafficLines) {
            val start = (segment.start - progressIndex).coerceAtLeast(0)
            val end = (segment.end - progressIndex).coerceAtMost(remaining.lastIndex)
            segment.line.isVisible = end > start
            if (end > start) segment.line.points = remaining.subList(start, end + 1).map(::latLng)
        }
    }
    private fun updateUser() {
        val google = map ?: return
        val position = location
        if (position == null || !options.optBoolean("showUser", true)) { userMarker?.remove(); userMarker = null; return }
        val marker = userMarker ?: google.addMarker(MarkerOptions().position(latLng(position)).anchor(0.5f, 0.5f).zIndex(100f))?.also { userMarker = it } ?: return
        marker.position = latLng(position); marker.setIcon(icons.user(navigating)); marker.isFlat = navigating
        marker.rotation = if (navigating) heading else 0f
    }
    private fun followUser() {
        if (!navigating || !following) return
        val google = map ?: return
        val position = location ?: return
        google.animateCamera(CameraUpdateFactory.newCameraPosition(CameraPosition.Builder().target(latLng(position)).bearing(heading).tilt(60f).zoom(navigationZoom).build()), 500, null)
    }
    private fun initializeCamera() {
        val google = map ?: return
        if (initializedCamera || width == 0 || height == 0) return
        val initial = options.optJSONObject("initialRegion")
        if (initial != null && point(initial) != null) {
            val center = point(initial)!!
            val savedZoom = initial.optDouble("zoom", Double.NaN)
            if (savedZoom.isFinite()) {
                google.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng(center), savedZoom.toFloat().coerceIn(google.minZoomLevel, google.maxZoomLevel)))
                initializedCamera = true
                return
            }
            val lat = initial.optDouble("latitudeDelta", 0.02) / 2
            val lon = initial.optDouble("longitudeDelta", 0.02) / 2
            val bounds = LatLngBounds.Builder().include(LatLng((center.latitude - lat).coerceIn(-85.0, 85.0), center.longitude - lon)).include(LatLng((center.latitude + lat).coerceIn(-85.0, 85.0), center.longitude + lon)).build()
            google.moveCamera(CameraUpdateFactory.newLatLngBounds(bounds, dp(16f).toInt())); initializedCamera = true
        } else location?.let { google.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng(it), 14.5f)); initializedCamera = true }
    }
    private fun fitScene() {
        val google = map ?: return
        if (!pendingFit || navigating || width == 0 || height == 0) return
        val coordinates = points(scene.optJSONArray("cameraPoints"))
        pendingFit = false
        if (coordinates.isEmpty()) return
        val unique = coordinates.distinct()
        val update = if (unique.size == 1) CameraUpdateFactory.newLatLngZoom(latLng(unique[0]), 15.5f)
            else CameraUpdateFactory.newLatLngBounds(LatLngBounds.Builder().apply { unique.forEach { include(latLng(it)) } }.build(), dp(30f).toInt())
        initializedCamera = true; google.animateCamera(update, 650, null)
    }
    private fun placeLabels() {
        val google = map ?: return
        if (width == 0 || height == 0) return
        val occupied = mutableListOf<RectF>()
        for ((route, marker) in labels.sortedBy { if (it.first.index == selectedRoute?.index) 0 else 1 }) {
            val candidates = listOf(0.5, 0.35, 0.65, 0.2, 0.8).mapNotNull { MetroMapGeometry.atFraction(route.points, it) }
            var placed = false
            for (candidate in candidates) {
                val pixel = google.projection.toScreenLocation(latLng(candidate))
                val rectangle = RectF(pixel.x - dp(58f), pixel.y - dp(66f), pixel.x + dp(58f), pixel.y + dp(4f))
                if (rectangle.left < dp(8f) || rectangle.right > width - dp(8f) || rectangle.top < dp(options.optDouble("top", 0.0).toFloat() + 10f) || rectangle.bottom > height - dp(options.optDouble("bottom", 0.0).toFloat() + 100f)) continue
                if (occupied.any { RectF.intersects(it, rectangle) }) continue
                marker.position = latLng(candidate); marker.isVisible = true; occupied.add(rectangle); placed = true; break
            }
            if (!placed) marker.isVisible = false
        }
    }
    private fun emitCamera() {
        val google = map ?: return
        val bounds = google.projection.visibleRegion.latLngBounds
        val center = google.cameraPosition.target
        val longitudeDelta = ((bounds.northeast.longitude - bounds.southwest.longitude + 360) % 360).coerceAtLeast(0.000001)
        emit("camera") {
            putDouble("heading", google.cameraPosition.bearing.toDouble())
            putMap("region", Arguments.createMap().apply {
                putDouble("latitude", center.latitude); putDouble("longitude", center.longitude); putDouble("zoom", google.cameraPosition.zoom.toDouble())
                putDouble("latitudeDelta", abs(bounds.northeast.latitude - bounds.southwest.latitude).coerceAtLeast(0.000001)); putDouble("longitudeDelta", longitudeDelta)
            })
        }
    }
    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) { super.onSizeChanged(w, h, oldw, oldh); post { if (!destroyed) { initializeCamera(); fitScene(); placeLabels() } } }
    override fun onAttachedToWindow() { super.onAttachedToWindow(); if (react.lifecycleState == LifecycleState.RESUMED) onHostResume() }
    override fun onHostResume() { if (!destroyed) { if (!started) { mapView?.onStart(); started = true }; if (!resumed) { mapView?.onResume(); resumed = true } } }
    override fun onHostPause() { if (!destroyed) { if (resumed) { mapView?.onPause(); resumed = false }; if (started) { mapView?.onStop(); started = false } } }
    override fun onHostDestroy() { destroy() }
    override fun onLowMemory() { if (!destroyed) { mapView?.onLowMemory(); icons.clear() } }
    override fun onTrimMemory(level: Int) { if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) onLowMemory() }
    override fun onConfigurationChanged(configuration: Configuration) {}
    fun destroy() {
        if (destroyed) return
        onHostPause(); destroyed = true
        react.removeLifecycleEventListener(this); react.applicationContext.unregisterComponentCallbacks(this)
        map?.apply { setOnCameraIdleListener(null); setOnCameraMoveStartedListener(null); setOnMarkerClickListener(null); setOnMapClickListener(null); setOnPoiClickListener(null); setOnPolylineClickListener(null); clear() }
        map = null; mapView?.onDestroy(); icons.clear()
    }
}
