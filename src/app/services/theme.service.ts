import { Injectable } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'theme_mode';
  private readonly LEGACY_KEY = 'theme';

  init() {
    const saved = localStorage.getItem(this.KEY) as ThemeMode | null;
    if (saved) return this.set(saved);

    // Migrazione legacy: alcune versioni precedenti usavano la chiave "theme"
    const legacy = localStorage.getItem(this.LEGACY_KEY) as ThemeMode | null;
    if (legacy === 'light' || legacy === 'dark') {
      return this.set(legacy);
    }

    // Default applicativo: dark mode
    this.set('dark');
  }

  get(): ThemeMode {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
  }

    set(mode: ThemeMode) {
    const isDark = mode === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);

    localStorage.setItem(this.KEY, mode);
    }

  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  }
}
