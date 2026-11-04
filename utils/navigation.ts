export interface Coordinate { latitude: number; longitude: number }

// Measure distance to segments so sparse route geometry does not trigger false deviations.
export function distanceToRoute(position: Coordinate, coordinates: Coordinate[]): number {
    const scale = Math.PI * 6371000 / 180;
    const longitudeScale = Math.cos(position.latitude * Math.PI / 180);
    const project = (p: Coordinate) => ({ x: (p.longitude - position.longitude) * scale * longitudeScale, y: (p.latitude - position.latitude) * scale });
    let nearest = Infinity;
    for (let i = 1; i < coordinates.length; i++) {
        const a = project(coordinates[i - 1]);
        const b = project(coordinates[i]);
        const dx = b.x - a.x, dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
        nearest = Math.min(nearest, Math.hypot(a.x + t * dx, a.y + t * dy));
    }
    return nearest;
}
