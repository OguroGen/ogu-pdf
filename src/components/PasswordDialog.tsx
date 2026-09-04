import { useEffect, useId, useRef } from "react";

type PasswordDialogProps = {
  fileName: string;
  isWrongPassword: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
};

export function PasswordDialog({
  fileName,
  isWrongPassword,
  onSubmit,
  onCancel,
}: PasswordDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isWrongPassword]);

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#10141c]/80 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1b2430] p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          const password = inputRef.current?.value ?? "";
          onSubmit(password);
        }}
      >
        <h2 className="text-lg font-semibold tracking-wide">パスワードが必要です</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">
          <span className="break-all text-white/90">{fileName}</span>
          を開くためのパスワードを入力してください。
        </p>
        <label className="mt-5 block text-sm text-white/80" htmlFor={inputId}>
          パスワード
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="password"
          autoComplete="off"
          className="mt-2 w-full rounded-lg border border-white/15 bg-[#10141c] px-3 py-2.5 outline-none focus:border-[#c56a32] focus:ring-2 focus:ring-[#c56a32]/40"
        />
        {isWrongPassword ? (
          <p className="mt-2 text-sm text-[#f0a090]" role="alert">
            パスワードが違います。もう一度入力してください。
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#c56a32] px-4 py-2 text-sm font-medium text-white hover:bg-[#d1763d]"
          >
            開く
          </button>
        </div>
      </form>
    </div>
  );
}
