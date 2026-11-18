export const GUEST_PROGRESS_STORAGE_KEY = 'aksademy_coding_playground_progress';

export interface ProgressStats {
    total: number;
    completed: number;
    percentage: number;
}

let memoryFallbackIds: number[] = [];

function canUseStorage(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        const storage = window.localStorage;
        if (!storage) {
            return false;
        }
        const probeKey = '__aksademy_pg_probe__';
        storage.setItem(probeKey, '1');
        storage.removeItem(probeKey);
        return true;
    } catch {
        return false;
    }
}

function normalizeIds(ids: unknown[]): number[] {
    return Array.from(
        new Set(
            ids
                .map((item) => Number(item))
                .filter((num) => Number.isInteger(num) && num > 0),
        ),
    );
}

export function getGuestCompletedLessonIds(): number[] {
    if (!canUseStorage()) {
        return [...memoryFallbackIds];
    }

    try {
        const raw = window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        const normalized = normalizeIds(parsed);
        memoryFallbackIds = normalized;
        return normalized;
    } catch {
        return [...memoryFallbackIds];
    }
}

function saveGuestCompletedLessonIds(ids: number[]): number[] {
    const normalized = normalizeIds(ids);
    memoryFallbackIds = normalized;

    if (canUseStorage()) {
        try {
            window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
            // Fall back to in-memory session state if storage quota or privacy restrictions block writes
        }
    }

    return normalized;
}

export function isGuestLessonCompleted(lessonId: number): boolean {
    return getGuestCompletedLessonIds().includes(lessonId);
}

export function markGuestLessonCompleted(lessonId: number): number[] {
    const current = getGuestCompletedLessonIds();
    if (current.includes(lessonId)) {
        return current;
    }

    return saveGuestCompletedLessonIds([...current, lessonId]);
}

export function unmarkGuestLessonCompleted(lessonId: number): number[] {
    const current = getGuestCompletedLessonIds();
    return saveGuestCompletedLessonIds(current.filter((id) => id !== lessonId));
}

export function calculateProgressStats(activeLessonIds: number[], completedLessonIds: number[]): ProgressStats {
    const activeSet = new Set(activeLessonIds.map((id) => Number(id)));
    const total = activeSet.size;

    if (total === 0) {
        return {
            total: 0,
            completed: 0,
            percentage: 0,
        };
    }

    const completedSet = new Set(
        completedLessonIds
            .map((id) => Number(id))
            .filter((id) => activeSet.has(id)),
    );

    const completed = completedSet.size;
    const percentage = Math.round((completed / total) * 100);

    return {
        total,
        completed,
        percentage,
    };
}
