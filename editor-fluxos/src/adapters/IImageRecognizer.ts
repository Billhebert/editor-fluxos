export interface ImageMatch {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

export interface ImageSearchOptions {
    assetId: string;
    confidence?: number;
    timeout?: number;
}

export interface IImageRecognizer {
    findImage(options: ImageSearchOptions): Promise<ImageMatch | null>;
}
