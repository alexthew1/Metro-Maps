// Keep read-modify-write operations in order so rapid actions cannot lose saved data.
export function createSerialTaskQueue() {
    let tail: Promise<unknown> = Promise.resolve();
    return function run<T>(task: () => Promise<T>): Promise<T> {
        const result = tail.then(task);
        tail = result.catch(() => {});
        return result;
    };
}
