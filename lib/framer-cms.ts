// Read-only access to a Framer project's own CMS, via Framer's Server API
// (https://www.framer.com/developers/server-api-quick-start, npm: framer-api).
// This is a ONE-WAY import: we snapshot Framer's collections/items here; edits
// made in our admin panel never get written back to the source project.
import { connect } from "framer-api";

export interface FramerFieldSnapshot {
  id: string;
  name: string;
  type: string;
}

export interface FramerItemSnapshot {
  framerId: string;
  slug: string | null;
  data: Record<string, unknown>;
}

export interface FramerCollectionSnapshot {
  framerId: string;
  name: string;
  fields: FramerFieldSnapshot[];
  items: FramerItemSnapshot[];
}

/** Reads every CMS collection (fields + items) from a Framer project. */
export async function fetchFramerCms(
  projectUrl: string,
  apiKey: string
): Promise<FramerCollectionSnapshot[]> {
  const framer = await connect(projectUrl, apiKey);
  try {
    const collections = await framer.getCollections();
    const out: FramerCollectionSnapshot[] = [];

    for (const collection of collections) {
      const [fields, items] = await Promise.all([collection.getFields(), collection.getItems()]);

      out.push({
        framerId: collection.id,
        name: collection.name,
        fields: fields.map((f) => {
          const raw = f as unknown as { id: string; name: string; type: string };
          return { id: raw.id, name: raw.name, type: raw.type };
        }),
        items: items.map((item) => {
          const raw = item as unknown as {
            id: string;
            slug?: string | null;
            fieldData?: Record<string, unknown>;
          };
          return { framerId: raw.id, slug: raw.slug ?? null, data: raw.fieldData ?? {} };
        }),
      });
    }

    return out;
  } finally {
    await framer.disconnect();
  }
}
