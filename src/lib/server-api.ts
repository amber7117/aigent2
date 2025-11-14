import { db } from "./firebase/server";
import { AIAgent } from './types';

export async function getAIAgents(): Promise<AIAgent[]> {
    const snap = await db.collection("aiAgents").get();
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));
}
