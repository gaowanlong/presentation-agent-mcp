import { Artifact, ArtifactFormat, MIMES } from "./artifact.schema.js";
import { ArtifactStore } from "../storage/artifact-store.js";
import { generateId } from "../utils/ids.js";

export class ArtifactService {
  constructor(private store: ArtifactStore) {}

  async createArtifact(
    deckId: string,
    format: ArtifactFormat,
    buffer: Buffer,
    hostPort?: string
  ): Promise<Artifact> {
    const artifactId = generateId("artifact");
    const ext = format === "pptx" ? ".pptx" : ".pdf";
    const mimeType = MIMES[format];
    const filePath = this.store.getExportPath(artifactId).replace(/\.\w+$/, ext);

    const artifact: Artifact = {
      artifact_id: artifactId,
      deck_id: deckId,
      format,
      mime_type: mimeType,
      size_bytes: buffer.length,
      file_path: filePath,
      download_url: hostPort ? `http://${hostPort}/artifacts/${artifactId}` : undefined,
      created_at: new Date().toISOString(),
    };

    await this.store.saveExport(
      {
        export_id: artifactId,
        deck_id: deckId,
        format,
        file_path: filePath,
        created_at: artifact.created_at,
      },
      buffer
    );

    return artifact;
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    // Derive deck_id from file system lookup
    const exportsDir = this.store.getExportPath("").replace(/\/[^/]+\.\w+$/, "");
    const fs = await import("node:fs");
    const path = await import("node:path");
    
    try {
      const files = fs.readdirSync(exportsDir);
      for (const file of files) {
        if (file.startsWith(artifactId)) {
          const stat = fs.statSync(path.join(exportsDir, file));
          const format = file.endsWith(".pdf") ? "pdf" as const : "pptx" as const;
          const mimeType = MIMES[format];
          return {
            artifact_id: artifactId,
            deck_id: "unknown",
            format,
            mime_type: mimeType,
            size_bytes: stat.size,
            file_path: path.join(exportsDir, file),
            created_at: stat.birthtime.toISOString(),
          };
        }
      }
    } catch { /* not found */ }
    return null;
  }
}
