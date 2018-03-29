declare module 'react' {
    interface Component<P, S> {
        register<T>(message: string, callback: (value: T) => void): void;
        unregister(): void;
        send(message: string, value: any): void;
        setSquawk(name: string): void;
        __squawk__name: string;
    }
}
export {};
