import Foundation

enum SafeTry {
    /// Execute a throwing closure safely; returns nil on failure (no crash).
    static func run<T>(_ block: () throws -> T, fallback: T? = nil) -> T? {
        do { return try block() }
        catch {
            print("⚠️ SafeTry caught error: \(error)")
            return fallback
        }
    }
}
