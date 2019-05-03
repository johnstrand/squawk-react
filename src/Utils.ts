export class Stack<T> {
    private _stack: T[] = [];

    public any() : boolean {
        return this._stack.length > 0;
    }

    public peek() : T {
        if(!this.any()) {
            throw Error("Stack is empty");
        }
        return this._stack[this._stack.length - 1];
    }

    public pop() : T {
        if(!this.any()) {
            throw Error("Stack is empty");
        }
        return this._stack.pop() as T;
    }

    public push(item : T): T {
        this._stack.push(item);
        return item;
    }
}

export class RenderDepth {
    private _depth: number = 0;
    private _suspended: boolean = false;

    public rendering(): boolean {
        return !this._suspended && this._depth > 0;
    }

    public increment(): number {
        return this._depth++;
    }

    public decrement(): number {
        return this._depth--;
    }

    public suspend(): void {
        this._suspended = true;
    }

    public resume(): void {
        this._suspended = false;
    }
}