import { ref, onUnmounted } from "vue";
import { liveQuery, type Subscription } from "dexie";

export function useLiveQuery<T>(factory: () => Promise<T>, initial: T) {
  const data = ref<T>(initial);
  let subscription: Subscription | null = null;

  subscription = liveQuery(factory).subscribe({
    next: (value) => {
      data.value = value;
    },
    error: (error) => {
      console.error("LiveQuery error", error);
    },
  });

  onUnmounted(() => {
    subscription?.unsubscribe();
  });

  return data;
}
