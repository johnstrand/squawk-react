declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        clear(message: string): void;
        getMessage<T>(message: string): T | undefined;
        getRegistrations(): string[];
        register<T>(message: string, callback: (value: T) => void, ignoreLast?: boolean): void;
        send(message: string, reducer: (state: any) => any): void;
        send(message: string, value: any): void;
        squawk(name: string): void;
        unregister(message?: string): void;
        setLogging(enabled: boolean): void;
    }
}
export {};
