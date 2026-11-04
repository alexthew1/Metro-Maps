package __PACKAGE__

import android.content.Context
import android.graphics.*
import android.util.LruCache
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import kotlin.math.ceil
import kotlin.math.max

class MetroMapIcons(private val context: Context) {
    private val density = context.resources.displayMetrics.density.coerceIn(1f, 4f)
    private val cache = LruCache<String, BitmapDescriptor>(96)
    private fun descriptor(key: String, draw: () -> Bitmap): BitmapDescriptor {
        cache.get(key)?.let { return it }
        return BitmapDescriptorFactory.fromBitmap(draw()).also { cache.put(key, it) }
    }
    fun user(navigation: Boolean): BitmapDescriptor = descriptor("user:$navigation") {
        if (navigation) {
            val id = context.resources.getIdentifier("metro_nav_puck", "drawable", context.packageName)
            Bitmap.createScaledBitmap(BitmapFactory.decodeResource(context.resources, id), (40 * density).toInt(), (40 * density).toInt(), true)
        } else {
            val bitmap = Bitmap.createBitmap((32 * density).toInt(), (32 * density).toInt(), Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap); canvas.scale(density, density)
            val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(40, 0, 137, 202) }
            canvas.drawCircle(16f, 16f, 16f, paint)
            paint.color = Color.WHITE; canvas.drawCircle(16f, 16f, 10f, paint)
            paint.color = Color.rgb(0, 137, 202); canvas.drawCircle(16f, 16f, 7f, paint)
            bitmap
        }
    }
    fun origin(): BitmapDescriptor = descriptor("origin") {
        val bitmap = Bitmap.createBitmap((20 * density).toInt(), (20 * density).toInt(), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap); canvas.scale(density, density)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
        canvas.drawCircle(10f, 10f, 9f, paint)
        paint.color = Color.rgb(22, 87, 136); canvas.drawCircle(10f, 10f, 6f, paint)
        bitmap
    }
    fun label(time: String, distance: String, selected: Boolean): BitmapDescriptor = descriptor("label:$time:$distance:$selected") {
        val title = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = 15f; typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
            color = if (selected) Color.WHITE else Color.rgb(52, 70, 83); textAlign = Paint.Align.CENTER
        }
        val detail = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textSize = 12f; typeface = Typeface.create("sans-serif", Typeface.NORMAL)
            color = if (selected) Color.rgb(219, 239, 255) else Color.rgb(82, 97, 107); textAlign = Paint.Align.CENTER
        }
        val width = max(112f, max(title.measureText(time), detail.measureText(distance)) + 24f)
        val bitmap = Bitmap.createBitmap(ceil(width * density).toInt(), ceil(64 * density).toInt(), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap); canvas.scale(density, density)
        val background = if (selected) Color.rgb(22, 87, 136) else Color.WHITE
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = background }
        canvas.drawRoundRect(RectF(1f, 1f, width - 1f, 54f), 3f, 3f, paint)
        paint.style = Paint.Style.STROKE; paint.strokeWidth = 2f
        paint.color = if (selected) Color.WHITE else Color.rgb(141, 157, 171)
        canvas.drawRoundRect(RectF(1f, 1f, width - 1f, 54f), 3f, 3f, paint)
        paint.style = Paint.Style.FILL; paint.color = background
        val tip = Path().apply { moveTo(width / 2 - 7f, 53f); lineTo(width / 2, 63f); lineTo(width / 2 + 7f, 53f); close() }
        canvas.drawPath(tip, paint)
        canvas.drawText(time, width / 2, 23f, title); canvas.drawText(distance, width / 2, 42f, detail)
        bitmap
    }
    fun clear() { cache.evictAll() }
}
