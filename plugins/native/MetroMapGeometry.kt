package __PACKAGE__

import kotlin.math.*

data class MapPoint(val latitude: Double, val longitude: Double)
data class MapProjection(val index: Int, val point: MapPoint, val distance: Double)

object MetroMapGeometry {
    private const val METERS_PER_DEGREE = Math.PI * 6371000.0 / 180.0
    private fun longitudeDelta(value: Double) = ((value + 540.0) % 360.0) - 180.0
    fun distance(a: MapPoint, b: MapPoint): Double = hypot((a.latitude - b.latitude) * METERS_PER_DEGREE,
        longitudeDelta(a.longitude - b.longitude) * METERS_PER_DEGREE * cos((a.latitude + b.latitude) * Math.PI / 360.0))

    fun project(location: MapPoint, points: List<MapPoint>, start: Int = 0): MapProjection? {
        if (points.size < 2) return null
        val scale = METERS_PER_DEGREE * cos(location.latitude * Math.PI / 180.0).coerceAtLeast(0.000001)
        fun search(first: Int, end: Int): MapProjection? {
            var result: MapProjection? = null
            for (i in first until end) {
                val a = points[i]; val b = points[i + 1]
                val ax = longitudeDelta(a.longitude - location.longitude) * scale
                val ay = (a.latitude - location.latitude) * METERS_PER_DEGREE
                val dx = longitudeDelta(b.longitude - a.longitude) * scale
                val dy = (b.latitude - a.latitude) * METERS_PER_DEGREE
                val squared = dx * dx + dy * dy
                val t = if (squared == 0.0) 0.0 else (-(ax * dx + ay * dy) / squared).coerceIn(0.0, 1.0)
                val deviation = hypot(ax + t * dx, ay + t * dy)
                if (result == null || deviation < result.distance) result = MapProjection(i,
                    if (t == 0.0) a else if (t == 1.0) b else MapPoint(a.latitude + (b.latitude - a.latitude) * t, longitudeDelta(a.longitude + longitudeDelta(b.longitude - a.longitude) * t)), deviation)
            }
            return result
        }
        val first = (start - 2).coerceIn(0, points.size - 2)
        val local = search(first, (start + 80).coerceIn(first + 1, points.size - 1))
        return if (local == null || local.distance > 100.0) search(0, points.size - 1) else local
    }

    fun atFraction(points: List<MapPoint>, fraction: Double): MapPoint? {
        if (points.isEmpty()) return null
        if (points.size == 1 || fraction <= 0.0) return points[0]
        if (fraction >= 1.0) return points.last()
        val lengths = points.zipWithNext { a, b -> distance(a, b) }
        val total = lengths.sum()
        if (total == 0.0) return points[0]
        var remaining = total * fraction.coerceIn(0.0, 1.0)
        for (i in lengths.indices) {
            if (remaining <= lengths[i] && lengths[i] > 0.0) {
                val t = remaining / lengths[i]
                val a = points[i]; val b = points[i + 1]
                return MapPoint(a.latitude + (b.latitude - a.latitude) * t, longitudeDelta(a.longitude + longitudeDelta(b.longitude - a.longitude) * t))
            }
            remaining -= lengths[i]
        }
        return points.last()
    }
}
