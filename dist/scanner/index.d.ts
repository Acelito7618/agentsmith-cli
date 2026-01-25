/**
 * Scanner - The Eye of Agent Smith
 * Enumerates repository structure, detects language/framework, finds config files.
 */
export interface ScanResult {
    rootPath: string;
    files: FileInfo[];
    language: string;
    framework: string | null;
    configFiles: string[];
    testFiles: string[];
    sourceDirectories: string[];
}
export interface FileInfo {
    path: string;
    relativePath: string;
    extension: string;
    size: number;
    isTest: boolean;
    isConfig: boolean;
}
export declare class Scanner {
    private rootPath;
    private verbose;
    constructor(rootPath: string, verbose?: boolean);
    scan(): Promise<ScanResult>;
    private detectLanguage;
    private detectFramework;
    private isTestFile;
    private isConfigFile;
    private detectSourceDirectories;
}
//# sourceMappingURL=index.d.ts.map