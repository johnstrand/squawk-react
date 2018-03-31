declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        getMessage<T>(message: string): T | undefined;
        getRegistrations(): string[];
        register<T>(message: string, callback: (value: T) => void): void;
        send(message: string, value: any): void;
        squawk(name: string): void;
        unregister(message?: string): void;
    }
}
export {};
