declare module "react" {
    interface Component<P, S> {
        __squawk_identity: string;
        register<T>(message: string, callback: (value: T) => void): void;
        unregister(message?: string): void;
        send(message: string, value: any): void;
        squawk(name: string): void;
    }
}
export {};
