/* ============================================================
   🍽️ SOLUTION MENU — MENU TACTILE
   Design premium cohérent avec le login (teal + slate)
   Responsive : mobile → ultra-wide
   ============================================================ */

#menuTactilePage {
    background: #F7F8FA !important;
    min-height: 100vh;
    min-height: 100dvh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
}

#menuTactileContent {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 0 140px 0;
    position: relative;
}

/* ===== HEADER ===== */
.sm-header {
    background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
    padding: clamp(16px, 2.5vw, 28px) clamp(16px, 3vw, 32px);
    border-radius: 0 0 24px 24px;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: hidden;
}

.sm-header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -30%;
    width: 150%;
    height: 150%;
    background: radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, transparent 60%);
    pointer-events: none;
    animation: smFloatGlow 8s ease-in-out infinite;
}

@keyframes smFloatGlow {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-10%, 10%); }
}

.sm-header-content {
    display: flex;
    align-items: center;
    gap: clamp(12px, 2vw, 18px);
    position: relative;
    z-index: 1;
    max-width: 500px;
    margin: 0 auto;
}

.sm-brand-icon {
    width: clamp(48px, 8vw, 64px);
    height: clamp(48px, 8vw, 64px);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(20, 184, 166, 0.4);
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.2);
}

.sm-brand-icon img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sm-brand-icon i {
    color: #14B8A6;
    font-size: clamp(20px, 3vw, 28px);
}

.sm-brand-text {
    min-width: 0;
}

.sm-brand-text h1 {
    margin: 0;
    color: #fff;
    font-size: clamp(1.15rem, 2.2vw, 1.6rem);
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.15;
}

.sm-brand-text h1 span {
    color: #14B8A6;
    text-shadow: 0 2px 12px rgba(20, 184, 166, 0.4);
}

.sm-brand-text p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: clamp(0.75rem, 1.2vw, 0.9rem);
    font-weight: 500;
}

.sm-close-btn {
    position: absolute;
    top: clamp(10px, 2vw, 16px);
    right: clamp(10px, 2vw, 16px);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.3);
    color: #fff;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    z-index: 2;
}

.sm-close-btn:hover {
    background: rgba(0, 0, 0, 0.5);
    transform: rotate(90deg);
}

/* ===== CATEGORIES ===== */
.sm-categories {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 16px clamp(12px, 3vw, 24px) 8px;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
}

.sm-categories::-webkit-scrollbar { display: none; }

.sm-chip {
    flex-shrink: 0;
    padding: 9px 18px;
    border-radius: 50px;
    border: 1.5px solid #E2E8F0;
    background: #FFFFFF;
    color: #0F172A;
    font-size: clamp(0.8rem, 1.2vw, 0.9rem);
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    font-family: inherit;
    white-space: nowrap;
}

.sm-chip:hover {
    border-color: #14B8A6;
    color: #14B8A6;
    transform: translateY(-1px);
}

.sm-chip.active {
    background: #14B8A6;
    border-color: #14B8A6;
    color: #fff;
    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.35);
}

/* ===== GRILLE PRODUITS ===== */
.sm-products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: clamp(10px, 1.5vw, 16px);
    padding: 8px clamp(12px, 3vw, 24px) 24px;
}

.sm-product-card {
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 16px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.sm-product-card:hover:not(.out-of-stock) {
    border-color: #14B8A6;
    transform: translateY(-3px);
    box-shadow: 0 12px 28px rgba(20, 184, 166, 0.18);
}

.sm-product-card.out-of-stock {
    opacity: 0.55;
    cursor: not-allowed;
}

.sm-product-img {
    position: relative;
    height: clamp(100px, 18vw, 160px);
    background: #F1F5F9;
    overflow: hidden;
}

.sm-product-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
}

.sm-product-card:hover:not(.out-of-stock) .sm-product-img img {
    transform: scale(1.05);
}

.sm-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #F1F5F9, #E2E8F0);
    color: #14B8A6;
    font-size: clamp(2rem, 4vw, 3rem);
}

.sm-promo-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: linear-gradient(135deg, #EF4444, #DC2626);
    color: #fff;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.sm-out-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #FEF2F2;
    color: #DC2626;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    border: 1px solid #FECACA;
}

.sm-product-info {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.sm-product-info h3 {
    margin: 0;
    font-size: clamp(0.8rem, 1.3vw, 0.95rem);
    font-weight: 700;
    color: #0F172A;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    min-height: 2.4em;
}

.sm-price-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
}

.sm-price {
    font-size: clamp(0.85rem, 1.3vw, 1rem);
    font-weight: 800;
    color: #14B8A6;
}

.sm-price-promo { color: #DC2626; }

.sm-price-old {
    font-size: 0.75rem;
    color: #64748B;
    text-decoration: line-through;
    font-weight: 500;
}

/* ===== ÉTATS VIDES ===== */
.sm-empty,
.sm-loading,
.sm-error {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #64748B;
}

.sm-empty i,
.sm-loading i,
.sm-error i {
    font-size: 3rem;
    color: #E2E8F0;
    margin-bottom: 12px;
    display: block;
}

.sm-loading i { color: #14B8A6; }
.sm-error i { color: #EF4444; }

.sm-error h3 {
    color: #0F172A;
    margin: 12px 0 8px;
    font-size: 1.1rem;
}

.sm-error p {
    margin: 0 0 16px;
    font-size: 0.9rem;
    color: #64748B;
}

.sm-btn-retry {
    padding: 10px 24px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, #14B8A6, #0D9488);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 4px 14px rgba(20, 184, 166, 0.35);
    transition: all 0.2s;
}

.sm-btn-retry:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.45);
}

/* ===== PANIER ===== */
.sm-cart {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFFFF;
    border-top: 1px solid #E2E8F0;
    border-radius: 20px 20px 0 0;
    padding: 14px clamp(14px, 3vw, 24px) max(14px, env(safe-area-inset-bottom));
    box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.1);
    z-index: 40;
    max-height: 60vh;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.sm-cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sm-cart-header strong {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: clamp(0.95rem, 1.4vw, 1.05rem);
    color: #0F172A;
    font-weight: 700;
}

.sm-cart-header strong i { color: #14B8A6; }

.sm-cart-badge {
    background: #14B8A6;
    color: #fff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
}

.sm-cart-empty {
    text-align: center;
    padding: 16px 0;
    color: #94A3B8;
}

.sm-cart-empty i {
    font-size: 1.8rem;
    color: #E2E8F0;
    margin-bottom: 6px;
    display: block;
}

.sm-cart-empty p {
    margin: 0;
    font-size: 0.85rem;
}

.sm-cart-items {
    max-height: 30vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-right: 4px;
}

.sm-cart-items::-webkit-scrollbar { width: 4px; }
.sm-cart-items::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 2px;
}

.sm-cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: #F8FAFC;
    border-radius: 10px;
    gap: 10px;
}

.sm-cart-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.sm-cart-item-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #0F172A;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.sm-cart-item-price {
    font-size: 0.75rem;
    color: #14B8A6;
    font-weight: 700;
}

.sm-cart-item-qty {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #E2E8F0;
    padding: 2px;
    flex-shrink: 0;
}

.sm-cart-item-qty button {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: #F1F5F9;
    color: #0F172A;
    font-size: 1rem;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.sm-cart-item-qty button:hover {
    background: #14B8A6;
    color: #fff;
}

.sm-cart-item-qty span {
    min-width: 22px;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 700;
    color: #0F172A;
}

.sm-cart-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0 4px;
    border-top: 1px dashed #E2E8F0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #64748B;
}

.sm-cart-total span:last-child {
    font-size: clamp(1.1rem, 1.8vw, 1.3rem);
    font-weight: 800;
    color: #14B8A6;
    letter-spacing: -0.3px;
}

.sm-btn-validate {
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #14B8A6, #0D9488);
    color: #fff;
    font-size: clamp(0.9rem, 1.4vw, 1rem);
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(20, 184, 166, 0.35);
    transition: all 0.2s ease;
}

.sm-btn-validate:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(20, 184, 166, 0.45);
}

.sm-btn-clear {
    width: 100%;
    padding: 8px 16px;
    border: 1.5px solid #E2E8F0;
    border-radius: 10px;
    background: #fff;
    color: #64748B;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.15s;
}

.sm-btn-clear:hover {
    border-color: #FCA5A5;
    color: #DC2626;
    background: #FEF2F2;
}

/* ===== BOUTON PLEIN ÉCRAN ===== */
.sm-fullscreen-btn {
    position: fixed;
    bottom: calc(100px + env(safe-area-inset-bottom));
    right: 16px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(135deg, #14B8A6, #0D9488);
    color: #fff;
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4);
    z-index: 45;
    transition: all 0.2s ease;
}

.sm-fullscreen-btn:hover {
    transform: scale(1.1) rotate(90deg);
}

/* ===== RESPONSIVE TABLETTE ≥ 768px ===== */
@media (min-width: 768px) {
    #menuTactileContent {
        padding: 0 0 40px 0;
        display: grid;
        grid-template-columns: 1fr 340px;
        grid-template-rows: auto auto 1fr;
        grid-template-areas:
            "header header"
            "cats cats"
            "products cart";
        gap: 0;
        align-items: start;
    }

    .sm-header { grid-area: header; }
    .sm-categories { grid-area: cats; padding-top: 20px; }

    .sm-products-grid {
        grid-area: products;
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        padding-bottom: 40px;
    }

    .sm-cart {
        grid-area: cart;
        position: sticky;
        top: 100px;
        bottom: auto;
        left: auto;
        right: auto;
        margin: 8px 16px 24px 0;
        border-radius: 20px;
        border: 1.5px solid #E2E8F0;
        max-height: calc(100vh - 130px);
        box-shadow: 0 10px 40px rgba(15, 23, 42, 0.12);
    }

    .sm-cart-items { max-height: 40vh; }

    .sm-fullscreen-btn {
        bottom: 24px;
        right: 24px;
    }
}

/* ===== RESPONSIVE DESKTOP ≥ 1024px ===== */
@media (min-width: 1024px) {
    #menuTactileContent {
        grid-template-columns: 1fr 380px;
        padding: 0 16px 40px;
    }

    .sm-header {
        border-radius: 20px;
        margin-top: 20px;
    }

    .sm-header-content { max-width: 100%; }

    .sm-products-grid {
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    }

    .sm-cart { margin: 20px 0 24px 0; }
}

/* ===== RESPONSIVE ULTRA-WIDE ≥ 1600px ===== */
@media (min-width: 1600px) {
    #menuTactileContent {
        grid-template-columns: 1fr 420px;
        max-width: 1600px;
    }

    .sm-products-grid {
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    }
}

/* ===== RESPONSIVE PETIT MOBILE ≤ 380px ===== */
@media (max-width: 380px) {
    .sm-brand-text h1 { font-size: 1rem; }
    .sm-brand-text p { font-size: 0.7rem; }
    .sm-brand-icon { width: 42px; height: 42px; }

    .sm-products-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 8px;
        padding: 8px 10px 24px;
    }

    .sm-chip {
        padding: 7px 14px;
        font-size: 0.75rem;
    }
}

/* ===== RESPONSIVE PAYSAGE MOBILE ===== */
@media (max-height: 500px) and (orientation: landscape) {
    .sm-header {
        padding: 10px 16px;
        border-radius: 0 0 16px 16px;
    }

    .sm-brand-icon { width: 40px; height: 40px; }
    .sm-brand-text h1 { font-size: 1rem; }
    .sm-brand-text p { font-size: 0.7rem; }

    .sm-categories { padding: 10px 16px 6px; }
    .sm-cart { max-height: 55vh; }
    .sm-cart-items { max-height: 15vh; }
}

/* ===== ACCESSIBILITÉ ===== */
@media (prefers-reduced-motion: reduce) {
    .sm-header::before,
    .sm-product-card,
    .sm-chip,
    .sm-btn-validate,
    .sm-fullscreen-btn,
    .sm-close-btn,
    .sm-product-img img {
        animation: none !important;
        transition: none !important;
    }
}
