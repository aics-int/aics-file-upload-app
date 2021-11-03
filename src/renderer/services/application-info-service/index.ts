import * as os from "os";

import { gt } from "semver";

import HttpCacheClient from "../http-cache-client";

/**
 * Interface for querying information regarding the application itself and its runtime.
 */
export default class ApplicationInfoService extends HttpCacheClient {
  public static getApplicationVersion(): string {
    // Must be injected at build-time
    const applicationVersion = process.env.APPLICATION_VERSION;
    if (!applicationVersion) {
      throw new Error("APPLICATION_VERSION must be defined");
    }
    return applicationVersion;
  }

  public static getOS(): string {
    return os.type();
  }

  public static getUserName(): string {
    return os.userInfo().username;
  }

  public async getNewestApplicationVersion(): Promise<string> {
    let versions;
    try {
      versions = await this.get<{ name: string }[]>(
        "https://api.github.com/repos/aicsgithub/aics-file-upload-app/tags"
      );
    } catch (error) {
      throw new Error(`Failed to fetch release from GitHub: ${error.message}`);
    }
    if (!versions.length || !versions[0].name) {
      throw new Error(
        "Unexpected return format from GitHub while trying to determine newest app version"
      );
    }

    return versions.reduce(
      (newestSoFar, current) =>
        gt(newestSoFar, current.name) ? newestSoFar : current.name,
      versions[0].name
    );
  }
}
