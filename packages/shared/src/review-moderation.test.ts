import { describe, expect, it } from "vitest";
import { reviewInputSchema } from "./booking";
import { organizerRating, reviewPhotoDecisionSchema, reviewReplySchema, reviewReportSchema } from "./review-moderation";

describe("avis : réponse, signalement, photo (24)", () => {
  it("réponse : vide (retirée) ou au moins 2 caractères, 1000 au plus", () => {
    expect(reviewReplySchema.safeParse({ reviewId: "r1", text: "" }).success).toBe(true);
    expect(reviewReplySchema.safeParse({ reviewId: "r1", text: " x " }).success).toBe(false);
    expect(reviewReplySchema.safeParse({ reviewId: "r1", text: "Merci !" }).success).toBe(true);
    expect(reviewReplySchema.safeParse({ reviewId: "r1", text: "a".repeat(1001) }).success).toBe(false);
  });
  it("signalement : motif connu ; « autre » demande une explication", () => {
    expect(reviewReportSchema.safeParse({ reviewId: "r1", reason: "spam" }).success).toBe(true);
    expect(reviewReportSchema.safeParse({ reviewId: "r1", reason: "other" }).success).toBe(false);
    expect(reviewReportSchema.safeParse({ reviewId: "r1", reason: "other", message: "Avis en double" }).success).toBe(true);
    expect(reviewReportSchema.safeParse({ reviewId: "r1", reason: "injure" }).success).toBe(false);
  });
  it("photo : chemin dans review-uploads ; refus motivé", () => {
    expect(reviewInputSchema.safeParse({ reservationId: "r1", rating: 5, photoPath: "review-uploads/u1/p.jpg" }).success).toBe(true);
    expect(reviewInputSchema.safeParse({ reservationId: "r1", rating: 5, photoPath: "experiences/e1/p.jpg" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ reservationId: "r1", rating: 5, photoPath: "review-uploads/u1/../x.jpg" }).success).toBe(false);
    expect(reviewPhotoDecisionSchema.safeParse({ reviewId: "r1", decision: "reject" }).success).toBe(false);
    expect(reviewPhotoDecisionSchema.safeParse({ reviewId: "r1", decision: "approve" }).success).toBe(true);
  });
  it("note de l'organisateur : moyenne pondérée de ses activités", () => {
    expect(organizerRating([{ ratingAvg: 5, ratingCount: 3 }, { ratingAvg: 4, ratingCount: 1 }])).toEqual({ avg: 4.8, count: 4 });
    expect(organizerRating([])).toEqual({ avg: 0, count: 0 });
  });
});
