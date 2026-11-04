package __PACKAGE__

import org.junit.Assert.*
import org.junit.Test

class MetroMapGeometryTest {
    @Test fun sparseRoadProjectionUsesSegmentInsteadOfNearestVertex() {
        val road = listOf(MapPoint(40.0, -74.01), MapPoint(40.0, -73.99))
        val projection = MetroMapGeometry.project(MapPoint(40.001, -74.0), road)!!
        assertEquals(111.195, projection.distance, 0.1)
        assertEquals(40.0, projection.point.latitude, 0.000001)
        assertEquals(-74.0, projection.point.longitude, 0.000001)
    }
    @Test fun projectionClampsToEndpointAndHandlesDuplicatePoints() {
        val end = MapPoint(40.0, -73.99)
        val projection = MetroMapGeometry.project(MapPoint(40.0, -73.98), listOf(MapPoint(40.0, -74.0), end))!!
        assertEquals(end, projection.point)
        assertTrue(projection.distance > 800)
        assertEquals(0.0, MetroMapGeometry.project(end, listOf(end, end))!!.distance, 0.001)
        assertNull(MetroMapGeometry.project(end, emptyList()))
    }
    @Test fun labelPlacementUsesDistanceAlongRouteRatherThanVertexCount() {
        val points = listOf(MapPoint(0.0, 0.0), MapPoint(0.0, 0.001), MapPoint(0.0, 0.01))
        assertEquals(0.005, MetroMapGeometry.atFraction(points, 0.5)!!.longitude, 0.000001)
        assertEquals(points.first(), MetroMapGeometry.atFraction(points, -1.0))
        assertEquals(points.last(), MetroMapGeometry.atFraction(points, 2.0))
    }
    @Test fun progressCanRecoverAfterLocationJumpsBeyondSearchWindow() {
        val points = (0..200).map { MapPoint(0.0, it * 0.001) }
        val projection = MetroMapGeometry.project(MapPoint(0.0, 0.19), points, 0)!!
        assertTrue(projection.index >= 189)
        assertEquals(0.0, projection.distance, 0.001)
        assertNotNull(MetroMapGeometry.project(points.first(), points, 9999))
    }
    @Test fun dateLineUsesTheShortSegment() {
        val points = listOf(MapPoint(0.0, 179.9), MapPoint(0.0, -179.9))
        assertEquals(180.0, kotlin.math.abs(MetroMapGeometry.atFraction(points, 0.5)!!.longitude), 0.000001)
        assertEquals(0.0, MetroMapGeometry.project(MapPoint(0.0, 180.0), points)!!.distance, 0.001)
    }
}
