/**
 * Assimilate Command
 * "You hear that, Mr. Anderson? That is the sound of inevitability."
 */
interface AssimilateOptions {
    dryRun?: boolean;
    verbose?: boolean;
    output?: string;
}
export declare function assimilateCommand(target: string, options: AssimilateOptions): Promise<void>;
export {};
//# sourceMappingURL=assimilate.d.ts.map