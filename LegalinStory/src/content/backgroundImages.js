// Static imports publish the supplied artwork in standalone and embedded builds.
export const backgroundImages = {
  living: new URL("../../../fotoss/Gemini_Generated_Image_3mjvj13mjvj13mjv.webp", import.meta.url).href,
  exterior: new URL("../../../fotoss/Gemini_Generated_Image_7szllf7szllf7szl.webp", import.meta.url).href,
  classroom: new URL("../../../fotoss/Gemini_Generated_Image_agpumragpumragpu.webp", import.meta.url).href,
  library: new URL("../../../fotoss/Gemini_Generated_Image_atty71atty71atty.webp", import.meta.url).href,
  bedroom: new URL("../../../fotoss/Gemini_Generated_Image_e7py6me7py6me7py.webp", import.meta.url).href,
  courtyard: new URL("../../../fotoss/Gemini_Generated_Image_otcqneotcqneotcq.webp", import.meta.url).href,
  office: new URL("../../../fotoss/Gemini_Generated_Image_r2y2bgr2y2bgr2y2.webp", import.meta.url).href,
  hallway: new URL("../../../fotoss/Gemini_Generated_Image_wxqhqiwxqhqiwxqh.webp", import.meta.url).href,
  courtroom: new URL("../../../fotoss/Sunlit Empty Courtroom Interior.webp", import.meta.url).href,
};

const scenePhotos = {
  "classroom-day": "classroom", "classroom-dusk": "classroom",
  "school-exterior": "exterior", "school-courtyard": "courtyard",
  "patio-day": "courtyard", "bedroom-evening": "bedroom",
  "orientation-office": "office", "quiet-room": "living",
  "shelter-room": "living", "home-living-cold": "living",
  "court-friendly": "courtroom",
  "hallway-day": "hallway", "hallway-dusk": "hallway", clubroom: "library",
};

export function photoBackground(sceneId) {
  return backgroundImages[scenePhotos[sceneId]] ?? null;
}
