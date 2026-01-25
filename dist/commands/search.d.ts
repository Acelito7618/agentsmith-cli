/**
 * Search Command
 * Query the skills and agents registry
 */
interface SearchOptions {
    limit?: string;
    type?: "skill" | "agent";
}
export declare function searchCommand(query: string, options: SearchOptions): Promise<void>;
export {};
//# sourceMappingURL=search.d.ts.map