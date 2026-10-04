import { useSettingsStore } from '@renderer/stores/settingsStore';

export function ReceiptFooter(): React.JSX.Element {
  const { settings } = useSettingsStore();
  const customFooter = settings['store.receipt_footer'];

  return (
    <div className="pt-4 text-center text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
      <p>*** THANK YOU FOR SHOPPING! ***</p>
      {customFooter ? (
        <p className="text-[10px] italic">{customFooter}</p>
      ) : (
        <p className="text-[10px]">Exchange within 7 days with valid receipt.</p>
      )}
      <p className="pt-2 text-[10px] font-semibold text-zinc-500">Powered By ZENTHROPIC Technologies</p>
      <p className="text-[10px] text-zinc-400">www.zenthropic-technologies.vercel.app</p>
      <p className="text-[10px] text-zinc-400">+92 312 3001579</p>
    </div>
  );
}
