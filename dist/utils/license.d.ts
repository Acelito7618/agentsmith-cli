/**
 * License Detection - The Gatekeeper
 * Ensures only repos with permissive licenses are assimilated.
 * "We're not here because we're free. We're here because we're not free."
 */
export interface LicenseInfo {
    detected: boolean;
    name: string | null;
    spdxId: string | null;
    permissive: boolean;
    file: string | null;
}
export declare function detectLicense(repoPath: string): Promise<LicenseInfo>;
export declare function formatLicenseStatus(license: LicenseInfo): string;
//# sourceMappingURL=license.d.ts.map