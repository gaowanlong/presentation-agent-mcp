import { FilledSlide, FilledSlot } from "../layout/layout-plan.js";

interface ContentUnit { text: string; used_in: string[]; }
export class ContentDeduplicator {
  private units: ContentUnit[] = [];

  deduplicate(slides: FilledSlide[]): FilledSlide[] {
    this.units = [];
    return slides.map(slide => ({
      ...slide,
      filled_slots: slide.filled_slots.map(slot => this.processSlot(slot, slide.slide_id)),
    }));
  }

  private processSlot(slot: FilledSlot, slideId: string): FilledSlot {
    const existing = this.units.find(u => this.similar(u.text, slot.content));
    if (existing && !existing.used_in.includes(slideId)) {
      existing.used_in.push(slideId);
      if (existing.used_in.length > 1) {
        return { ...slot, content: "[see related content on slide " + existing.used_in[0] + "]" };
      }
    } else if (!existing) {
      this.units.push({ text: slot.content, used_in: [slideId] });
    }
    return slot;
  }

  private similar(a: string, b: string): boolean {
    if (a === b) return true;
    const short = a.length < b.length ? a : b;
    const long = a.length < b.length ? b : a;
    return long.startsWith(short) || short.startsWith(long);
  }

  getStats() { return { total_units: this.units.length, duplicated: this.units.filter(u => u.used_in.length > 1).length }; }
}

