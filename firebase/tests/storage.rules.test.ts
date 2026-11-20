import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { getBytes, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;
const MB = 1024 * 1024;
const bytes = (size: number) => new Uint8Array(size);
const store = (uid?: string, role?: string, orgId?: string) =>
  (uid ? env.authenticatedContext(uid, { ...(role ? { role } : {}), ...(orgId ? { orgId } : {}) }) : env.unauthenticatedContext()).storage() as unknown as FirebaseStorage;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-thecommunity",
    storage: { rules: readFileSync("firebase/storage.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage() as unknown as FirebaseStorage, "experiences/e1/cover.webp"), bytes(10), { contentType: "image/webp" });
    await uploadBytes(ref(ctx.storage() as unknown as FirebaseStorage, "users/salma/avatar/a.webp"), bytes(10), { contentType: "image/webp" });
    await uploadBytes(ref(ctx.storage() as unknown as FirebaseStorage, "organizer-uploads/olive/documents/rc.pdf"), bytes(10), { contentType: "application/pdf" });
    await uploadBytes(ref(ctx.storage() as unknown as FirebaseStorage, "organizers/orgA/public/logo.webp"), bytes(10), { contentType: "image/webp" });
  });
});
afterAll(async () => env.cleanup());

describe("stockage des fichiers", () => {
  it("photos d'expériences : lecture publique, envoi réservé à l'équipe, images de 8 Mo max", async () => {
    await assertSucceeds(getBytes(ref(store(), "experiences/e1/cover.webp")));
    await assertSucceeds(uploadBytes(ref(store("ada", "admin"), "experiences/e1/2.jpg"), bytes(1 * MB), { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(store("salma"), "experiences/e1/3.jpg"), bytes(1000), { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(store("ada", "admin"), "experiences/e1/doc.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(store("ada", "admin"), "experiences/e1/big.jpg"), bytes(9 * MB), { contentType: "image/jpeg" }));
  });
  it("photo de profil : envoi par son propriétaire (3 Mo max), visible des membres connectés", async () => {
    await assertSucceeds(uploadBytes(ref(store("salma"), "users/salma/avatar/b.webp"), bytes(1 * MB), { contentType: "image/webp" }));
    await assertFails(uploadBytes(ref(store("karim"), "users/salma/avatar/c.webp"), bytes(1000), { contentType: "image/webp" }));
    await assertFails(uploadBytes(ref(store("salma"), "users/salma/avatar/d.webp"), bytes(4 * MB), { contentType: "image/webp" }));
    await assertFails(uploadBytes(ref(store("salma"), "users/salma/avatar/e.svg"), bytes(1000), { contentType: "image/svg+xml" }));
    await assertSucceeds(getBytes(ref(store("karim"), "users/salma/avatar/a.webp")));
    await assertFails(getBytes(ref(store(), "users/salma/avatar/a.webp")));
  });
  it("candidature organisateur (19) : pièces privées dans son propre dossier, 10 Mo max, PDF ou image", async () => {
    await assertSucceeds(uploadBytes(ref(store("olive"), "organizer-uploads/olive/documents/assurance.pdf"), bytes(2 * MB), { contentType: "application/pdf" }));
    await assertSucceeds(uploadBytes(ref(store("olive"), "organizer-uploads/olive/logo/logo.png"), bytes(1 * MB), { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(store("olive"), "organizer-uploads/olive/logo/logo.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(store("olive"), "organizer-uploads/olive/documents/big.pdf"), bytes(11 * MB), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(store("olive"), "organizer-uploads/olive/autre/x.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(store("omar"), "organizer-uploads/olive/documents/x.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertSucceeds(getBytes(ref(store("olive"), "organizer-uploads/olive/documents/rc.pdf")));
    await assertSucceeds(getBytes(ref(store("ada", "admin"), "organizer-uploads/olive/documents/rc.pdf")));
    await assertFails(getBytes(ref(store("omar", "organizer", "orgB"), "organizer-uploads/olive/documents/rc.pdf")));
    await assertFails(getBytes(ref(store(), "organizer-uploads/olive/documents/rc.pdf")));
  });
  it("organisateur validé (19) : photos publiques écrites par SES membres seulement", async () => {
    await assertSucceeds(getBytes(ref(store(), "organizers/orgA/public/logo.webp")));
    await assertSucceeds(uploadBytes(ref(store("olive", "organizer", "orgA"), "organizers/orgA/public/photo.jpg"), bytes(1 * MB), { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(store("omar", "organizer", "orgB"), "organizers/orgA/public/photo.jpg"), bytes(1000), { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(store("olive", undefined, "orgA"), "organizers/orgA/public/photo2.jpg"), bytes(1000), { contentType: "image/jpeg" }));
    await assertFails(uploadBytes(ref(store("olive", "organizer", "orgA"), "organizers/orgA/public/doc.pdf"), bytes(1000), { contentType: "application/pdf" }));
    await assertFails(uploadBytes(ref(store("olive", "organizer", "orgA"), "experiences/e1/4.jpg"), bytes(1000), { contentType: "image/jpeg" }));
    await assertSucceeds(uploadBytes(ref(store("ada", "admin"), "organizers/orgA/public/equipe.jpg"), bytes(1000), { contentType: "image/jpeg" }));
  });
  it("exports et dossiers non prévus : refusés", async () => {
    await assertFails(getBytes(ref(store("ada", "superadmin"), "exports/x.csv")));
    await assertFails(uploadBytes(ref(store("ada", "admin"), "divers/x.jpg"), bytes(10), { contentType: "image/jpeg" }));
  });
});
