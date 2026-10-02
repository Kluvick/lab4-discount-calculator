import { useState } from "react";
import "./DiscountCalculator.css";

const CATEGORIES = [
  { id: "electronics", label: "Электроника", discount: 5 },
  { id: "clothing",    label: "Одежда",       discount: 20 },
  { id: "groceries",   label: "Продукты",     discount: 10 },
  { id: "books",       label: "Книги",        discount: 20 },
  { id: "other",       label: "Другое",       discount: 0 },
];

const VAT_RATE = 0.22;
const PROMO_CODES = { WELCOME10: 10 }; // промокод → доп. скидка в %
const MAX_HISTORY = 5;

// Счётчик для уникальных id позиций
let nextId = 1;
function createProduct() {
  return { id: nextId++, price: "", category: "electronics" };
}

function formatRub(value) {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DiscountCalculator() {
  // --- Состояние ---
  const [products, setProducts] = useState([createProduct()]); // массив товаров
  const [customDiscountEnabled, setCustomDiscountEnabled] = useState(false);
  const [customDiscount, setCustomDiscount] = useState(0);     // 0..50 %
  const [promoCode, setPromoCode] = useState("");
  const [withVat, setWithVat] = useState(true);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  // --- Товары ---
  function handleAddProduct() {
  setProducts((prev) => [createProduct(), ...prev]); // добавляет в НАЧАЛО
  setCalculated(false);
  }   

  function handleRemoveProduct(id) {
    if (products.length === 1) return; // хотя бы одна позиция
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCalculated(false);
  }

  function handleProductChange(id, field, value) {
    if (field === "price" && value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setCalculated(false);
    setError("");
  }

  // --- Опции ---
  function handleCustomDiscountToggle(e) {
    setCustomDiscountEnabled(e.target.checked);
    setCalculated(false);
  }
  function handleCustomDiscountChange(e) {
    setCustomDiscount(Number(e.target.value));
    setCalculated(false);
  }
  function handlePromoChange(e) {
    setPromoCode(e.target.value);
    setCalculated(false);
  }
  function handleVatToggle(e) {
    setWithVat(e.target.checked);
    setCalculated(false);
  }

  // --- Расчёт ---
  function handleCalculate() {
    // Валидация
    for (const p of products) {
      if (!p.price.trim()) {
        setError("Заполните цену для всех товаров");
        setCalculated(false);
        return;
      }
      const n = parseFloat(p.price);
      if (isNaN(n) || n <= 0) {
        setError("Цена каждого товара должна быть положительным числом");
        setCalculated(false);
        return;
      }
    }
    setError("");
    setCalculated(true);

    // Добавить в историю
    const totals = computeTotals();
    setHistory((prev) =>
      [
        {
          id: Date.now(),
          date: new Date().toLocaleString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          }),
          itemsCount: products.length,
          promoCode: promoCode.trim().toUpperCase(),
          withVat,
          total: totals.total,
        },
        ...prev,
      ].slice(0, MAX_HISTORY)
    );
  }

  function handleReset() {
    setProducts([createProduct()]);
    setCustomDiscountEnabled(false);
    setCustomDiscount(0);
    setPromoCode("");
    setWithVat(true);
    setCalculated(false);
    setError("");
  }

  // --- Вычисления ---
  function computeTotals() {
    const perProduct = products.map((p) => {
      const price = parseFloat(p.price) || 0;
      const cat = CATEGORIES.find((c) => c.id === p.category);
      const discountPercent = customDiscountEnabled
        ? customDiscount
        : (cat ? cat.discount : 0);
      const discountAmount = price * (discountPercent / 100);
      const afterDiscount = price - discountAmount;
      return { price, discountPercent, discountAmount, afterDiscount, cat };
    });

    const subtotal = perProduct.reduce((s, x) => s + x.price, 0);
    const subtotalAfterDiscount = perProduct.reduce((s, x) => s + x.afterDiscount, 0);

    const promoKey = promoCode.trim().toUpperCase();
    const promoPercent = PROMO_CODES[promoKey] || 0;
    const promoAmount = subtotalAfterDiscount * (promoPercent / 100);
    const afterPromo = subtotalAfterDiscount - promoAmount;

    const vatAmount = withVat ? afterPromo * VAT_RATE : 0;
    const total = afterPromo + vatAmount;

    return {
      perProduct,
      subtotal,
      subtotalAfterDiscount,
      promoKey,
      promoPercent,
      promoAmount,
      afterPromo,
      vatAmount,
      total,
    };
  }

  const t = computeTotals();

  // --- Разметка ---
  return (
    <div className="calculator-wrapper">
      <h2 className="calculator-title">Калькулятор скидок</h2>

      {/* --- Товары --- */}
      <div className="products">
        <div className="products__header">
          <span className="products__heading">Товары</span>
          <button type="button" className="btn btn--ghost" onClick={handleAddProduct}>
            + Добавить товар
          </button>
        </div>

        {products.map((p, idx) => (
          <div key={p.id} className="product-row">
            <span className="product-row__num">{idx + 1}</span>
            <input
              type="text"
              className="field__input product-row__price"
              value={p.price}
              onChange={(e) => handleProductChange(p.id, "price", e.target.value)}
              placeholder="Цена, ₽"
              inputMode="decimal"
            />
            <select
              className="field__input field__select product-row__select"
              value={p.category}
              onChange={(e) => handleProductChange(p.id, "category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} — {c.discount}%
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => handleRemoveProduct(p.id)}
              disabled={products.length === 1}
              title="Удалить товар"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* --- Своя скидка --- */}
      <div className="field">
        <label className="field__label field__label--row">
          <input
            type="checkbox"
            checked={customDiscountEnabled}
            onChange={handleCustomDiscountToggle}
          />
          Своя скидка (заменяет категорийную)
        </label>
        {customDiscountEnabled && (
          <div className="range-row">
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={customDiscount}
              onChange={handleCustomDiscountChange}
              className="range"
            />
            <span className="range__value">{customDiscount}%</span>
          </div>
        )}
      </div>

      {/* --- Промокод --- */}
      <div className="field">
        <label htmlFor="promo" className="field__label">Промокод</label>
        <input
          id="promo"
          type="text"
          className="field__input"
          value={promoCode}
          onChange={handlePromoChange}
          placeholder="Например: WELCOME10"
        />
        {promoCode.trim() && (
          <span
            className={
              t.promoPercent > 0
                ? "field__hint field__hint--ok"
                : "field__hint field__hint--warn"
            }
          >
            {t.promoPercent > 0
              ? `Промокод применён: −${t.promoPercent}%`
              : "Промокод не найден"}
          </span>
        )}
      </div>

      {/* --- НДС --- */}
      <div className="field">
        <label className="field__label field__label--row">
          <input type="checkbox" checked={withVat} onChange={handleVatToggle} />
          Учитывать НДС (22%)
        </label>
      </div>

      {/* --- Ошибка --- */}
      {error && <div className="field__error field__error--block">{error}</div>}

      {/* --- Кнопки --- */}
      <div className="actions">
        <button type="button" className="btn btn--primary" onClick={handleCalculate}>
          Рассчитать
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleReset}>
          Сбросить
        </button>
      </div>

      {/* --- Результаты --- */}
      {calculated && !error && (
        <div className="results">
          <h3 className="results__title">Результат расчёта</h3>
          <table className="results__table">
            <tbody>
              {t.perProduct.map((x, i) => (
                <tr key={products[i].id}>
                  <td>
                    Товар {i + 1} — {x.cat.label} ({x.discountPercent}%)
                  </td>
                  <td className="results__value">{formatRub(x.afterDiscount)} ₽</td>
                </tr>
              ))}
              <tr>
                <td>Сумма без скидки</td>
                <td className="results__value">{formatRub(t.subtotal)} ₽</td>
              </tr>
              <tr>
                <td>Скидка по товарам</td>
                <td className="results__value results__value--discount">
                  −{formatRub(t.subtotal - t.subtotalAfterDiscount)} ₽
                </td>
              </tr>
              {t.promoPercent > 0 && (
                <tr>
                  <td>Промокод {t.promoKey} (ещё {t.promoPercent}%)</td>
                  <td className="results__value results__value--discount">
                    −{formatRub(t.promoAmount)} ₽
                  </td>
                </tr>
              )}
              <tr>
                <td>Итого после всех скидок</td>
                <td className="results__value">{formatRub(t.afterPromo)} ₽</td>
              </tr>
              {withVat && (
                <tr>
                  <td>НДС (22%)</td>
                  <td className="results__value">+{formatRub(t.vatAmount)} ₽</td>
                </tr>
              )}
              <tr className="results__row--total">
                <td>Итого к оплате</td>
                <td className="results__value">{formatRub(t.total)} ₽</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* --- История --- */}
      {history.length > 0 && (
        <div className="history">
          <h3 className="history__title">
            История (последние {history.length})
          </h3>
          <ul className="history__list">
            {history.map((h) => (
              <li key={h.id} className="history__item">
                <span className="history__date">{h.date}</span>
                <span className="history__info">
                  {h.itemsCount} тов.
                  {h.promoCode ? `, промокод ${h.promoCode}` : ""}
                  {h.withVat ? ", с НДС" : ", без НДС"}
                </span>
                <span className="history__total">{formatRub(h.total)} ₽</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DiscountCalculator;