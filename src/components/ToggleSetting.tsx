export function ToggleSetting({
  title,
  description,
  enabled,
  onChange
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div class="flex items-center justify-between py-2">
      <div class="flex flex-col">
        <span class="font-medium text-gray-900">{title}</span>
        <span class="text-sm text-gray-500">{description}</span>
      </div>
      <label class="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
          class="sr-only peer"
        />
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
        <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
      </label>
    </div>
  );
}
