"use client";

export function ProductBackButton() {
  function goBack() {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    const hasInternalReferrer = referrer?.origin === window.location.origin;

    if (hasInternalReferrer && window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/catalog");
  }

  return (
    <button className="product-back-button" onClick={goBack} type="button" aria-label="Вернуться назад">
      <span aria-hidden="true">←</span>
      Назад
    </button>
  );
}
