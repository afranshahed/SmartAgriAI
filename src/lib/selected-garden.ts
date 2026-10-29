export const SELECTED_GARDEN_STORAGE_KEY = "smart-agri:selected-garden-id";

export function getSelectedGardenId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_GARDEN_STORAGE_KEY);
}

export function setSelectedGardenId(gardenId: string) {
  window.localStorage.setItem(SELECTED_GARDEN_STORAGE_KEY, gardenId);
}
