package __PACKAGE__

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import java.io.File
import java.security.MessageDigest
import kotlin.math.ceil
import kotlin.math.max

class RouteMarkerModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "MetroRouteMarkers"

    @ReactMethod
    fun renderLabel(rawTime: String, rawDistance: String, selected: Boolean, promise: Promise) {
        try {
            val time = rawTime.take(64)
            val distance = rawDistance.take(64)
            val density = context.resources.displayMetrics.density.coerceIn(1f, 4f)
            val id = MessageDigest.getInstance("SHA-256").digest("v1|$time|$distance|$selected|$density".toByteArray())
                .joinToString("") { "%02x".format(it) }
            val directory = File(context.cacheDir, "route-markers").apply { mkdirs() }
            val file = File(directory, "$id.png")
            if (!file.exists()) {
                val title = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textSize = 15f
                    typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
                    color = if (selected) Color.WHITE else Color.rgb(52, 70, 83)
                    textAlign = Paint.Align.CENTER
                }
                val detail = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    textSize = 12f
                    typeface = Typeface.create("sans-serif", Typeface.NORMAL)
                    color = if (selected) Color.rgb(219, 239, 255) else Color.rgb(82, 97, 107)
                    textAlign = Paint.Align.CENTER
                }
                val width = max(112f, max(title.measureText(time), detail.measureText(distance)) + 24f)
                val bitmap = Bitmap.createBitmap(ceil(width * density).toInt(), ceil(64f * density).toInt(), Bitmap.Config.ARGB_8888)
                try {
                    val canvas = Canvas(bitmap)
                    canvas.scale(density, density)
                    val background = if (selected) Color.rgb(22, 87, 136) else Color.WHITE
                    val edge = if (selected) Color.WHITE else Color.rgb(141, 157, 171)
                    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = background }
                    canvas.drawRoundRect(RectF(1f, 1f, width - 1f, 54f), 3f, 3f, paint)
                    paint.style = Paint.Style.STROKE
                    paint.strokeWidth = 2f
                    paint.color = edge
                    canvas.drawRoundRect(RectF(1f, 1f, width - 1f, 54f), 3f, 3f, paint)
                    paint.style = Paint.Style.FILL
                    paint.color = background
                    val tip = Path().apply { moveTo(width / 2f - 7f, 53f); lineTo(width / 2f, 63f); lineTo(width / 2f + 7f, 53f); close() }
                    canvas.drawPath(tip, paint)
                    canvas.drawText(time, width / 2f, 23f, title)
                    canvas.drawText(distance, width / 2f, 42f, detail)
                    file.outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
                } finally {
                    bitmap.recycle()
                }
            }
            promise.resolve(Uri.fromFile(file).toString())
        } catch (error: Exception) {
            promise.reject("ROUTE_MARKER_RENDER_FAILED", "Could not draw route label", error)
        }
    }
}

class RouteMarkerPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(RouteMarkerModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = listOf(MetroMapManager())
}
