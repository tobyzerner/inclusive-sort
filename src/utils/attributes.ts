export class Attributes {
    private originalAttributes = new Map<string, string | null>();

    constructor(private target: Element) {}

    public set(qualifiedName: string, value: string) {
        this.saveOriginal(qualifiedName);
        this.target.setAttribute(qualifiedName, value);
    }

    public add(qualifiedName: string, value: string) {
        if (!this.target.hasAttribute(qualifiedName)) {
            this.set(qualifiedName, value);
        }
    }

    public remove(qualifiedName: string) {
        this.saveOriginal(qualifiedName);
        this.target.removeAttribute(qualifiedName);
    }

    private saveOriginal(qualifiedName: string) {
        if (!this.originalAttributes.has(qualifiedName)) {
            this.originalAttributes.set(
                qualifiedName,
                this.target.getAttribute(qualifiedName)
            );
        }
    }

    public revertAll() {
        for (let [qualifiedName, value] of this.originalAttributes) {
            if (value === null) {
                this.target.removeAttribute(qualifiedName);
            } else {
                this.target.setAttribute(qualifiedName, value);
            }
        }
        this.originalAttributes.clear();
    }
}
