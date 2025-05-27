// Ожидаем полной загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing script...");

    // --- Глобальные переменные и константы ---
    const WHATSAPP_NUMBER = '+79374897407';
    let cart = {};
    let activeCategory = 'all';
    let allMenuItems = [];
    let currentOrderDetailsForWhatsapp = '';

    // --- Получение ссылок на элементы DOM ---
    const productGrid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const cartButton = document.getElementById('cartButton');
    const cartCounter = document.getElementById('cartCounter');
    const cartPopup = document.getElementById('cartPopup');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const sticksInput = document.getElementById('sticks');
    const checkoutButton = document.getElementById('checkoutButton');
    const clearCartButton = document.getElementById('clearCartButton');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const scrollableNavContainer = document.querySelector('.nav-container');
    const allNavContainers = document.querySelectorAll('.desktop-nav, .mobile-nav');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const sliderTrack = document.getElementById('sliderTrack');
    const shapesContainer = document.querySelector('.shapes');
    const confirmationPopup = document.getElementById('confirmationPopup');
    const confirmationOverlay = document.getElementById('confirmationOverlay');
    const addressSection = document.getElementById('addressSection');
    const addressInput = document.getElementById('address');
    const commentInput = document.getElementById('comment');
    const confirmOrderButton = document.getElementById('confirmOrderButton');
    const cancelOrderButton = document.getElementById('cancelOrderButton');
    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    const toastContainer = document.getElementById('toast-container');
    const loadingMessage = productGrid ? productGrid.querySelector('.loading-message') : null;
    const preWhatsappConfirmationPopup = document.getElementById('preWhatsappConfirmationPopup');
    const proceedToWhatsAppButton = document.getElementById('proceedToWhatsAppButton');
    const cancelPreWhatsAppButton = document.getElementById('cancelPreWhatsAppButton');

    console.log("Initial element check:", {scrollableNavContainer, scrollLeftBtn, scrollRightBtn});


    function createProductCard(item) {
        try {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.category = item.category;
            cardElement.dataset.id = item.id;
            let basePrice;
            let displayPrice;
            let hasSizes = item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0;
            if (hasSizes) {
                basePrice = parseFloat(item.sizes[0].price);
                if (isNaN(basePrice)) { basePrice = 0; }
                displayPrice = basePrice;
            } else {
                basePrice = parseFloat(item.price);
                if (isNaN(basePrice)) { basePrice = 0; }
                displayPrice = basePrice;
            }
            cardElement.dataset.price = basePrice; // Устанавливаем базовую цену для фильтрации
            let sizeOptionsHTML = '';
            if (hasSizes) {
                sizeOptionsHTML = '<div class="size-options">';
                item.sizes.forEach((sizeInfo, index) => {
                    const sizePrice = parseFloat(sizeInfo.price);
                    const priceForButton = isNaN(sizePrice) ? 0 : sizePrice;
                    const isSelected = index === 0 ? 'selected' : ''; // Первый размер выбран по умолчанию
                    sizeOptionsHTML += `<button type="button" data-size="${sizeInfo.size}" data-price="${priceForButton}" class="${isSelected}">${sizeInfo.size}</button>`;
                });
                sizeOptionsHTML += '</div>';
            }
            const addToCartPrice = displayPrice; // Цена для кнопки "В корзину" по умолчанию (первого размера или единственная)

            // Формируем HTML для описания (состава)
            const descriptionHTML = item.description ? `<p class="product-description">${item.description}</p>` : ''; //

            cardElement.innerHTML = `
                <img src="${item.imageUrl || 'https://via.placeholder.com/300x200/cccccc/ffffff?text=No+Image'}" alt="${item.name}" loading="lazy">
                <div class="card-body">
                    <h3 class="product-name">${item.name || 'Название товара'}</h3>
                    ${descriptionHTML}
                    ${sizeOptionsHTML}
                    <div class="card-footer">
                        <span class="price">${displayPrice} ₽</span>
                        <button type="button" class="add-to-cart-btn" data-price="${addToCartPrice}">В корзину</button>
                    </div>
                </div>`;
            return cardElement;
        } catch (error) {
            console.error(`Error creating card for item ${item?.id || 'unknown'}:`, error);
            return null; // Возвращаем null, если произошла ошибка при создании карточки
        }
    }

    async function loadAndDisplayMenu() {
        if (!productGrid) {
            // console.warn("Product grid not found. Menu loading aborted.");
            return;
        }
        productGrid.classList.add('loading'); // Показываем состояние загрузки
        if (loadingMessage) loadingMessage.style.display = 'block';

        try {
            const response = await fetch('menu.json?t=' + Date.now()); // Добавляем параметр для предотвращения кеширования
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allMenuItems = await response.json();
            productGrid.innerHTML = ''; // Очищаем предыдущие элементы

            if (!Array.isArray(allMenuItems) || allMenuItems.length === 0) {
                 // console.warn("Menu data is empty or not an array.");
                 productGrid.innerHTML = '<p style="color: #555; text-align: center;">Меню пока пустое.</p>';
                 return;
            }

            allMenuItems.forEach(item => {
                const card = createProductCard(item);
                if (card) { // Только если карточка успешно создана
                    productGrid.appendChild(card);
                } else {
                    // console.warn(`Skipped item due to card creation error:`, item);
                }
            });
            updatePriceFilterValue(); // Обновляем фильтр после загрузки
            checkNavScroll(); // Вызываем здесь, так как ширина контейнера может измениться после загрузки продуктов (хотя категории статичны)
        } catch (error) {
            console.error("Не удалось загрузить меню:", error);
            if (productGrid) {
                productGrid.innerHTML = ''; // Очищаем в случае ошибки
                const errorElement = document.createElement('p');
                errorElement.style.color = 'var(--red-color, #d9534f)'; // Используем переменную CSS или fallback
                errorElement.style.textAlign = 'center';
                errorElement.style.padding = '40px';
                errorElement.style.gridColumn = '1 / -1'; // Растягиваем на всю ширину грида
                errorElement.textContent = 'Ошибка загрузки меню. Пожалуйста, попробуйте обновить страницу или зайдите позже.';
                productGrid.appendChild(errorElement);
            }
        } finally {
             if (productGrid) productGrid.classList.remove('loading'); // Убираем состояние загрузки
             if (loadingMessage) loadingMessage.style.display = 'none'; // Скрываем сообщение о загрузке
        }
    }

    function showToast(message, type = 'info') { // type может быть 'success', 'error', 'warning', 'info'
        if (!toastContainer) {
            alert(`${type.toUpperCase()}: ${message}`); // Fallback если контейнер не найден
            return;
        }
        try {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`; // Добавляем класс типа для стилизации
            toast.textContent = message;
            toastContainer.appendChild(toast);

            // Принудительный reflow для применения начальных стилей перед анимацией
            toast.offsetHeight; // eslint-disable-line no-unused-expressions

            // Плавное появление (если стили настроены на opacity/transform)
            // toast.classList.add('show'); // Если используете класс для появления

            // Удаление тоста через некоторое время
            setTimeout(() => {
                toast.classList.add('hide'); // Добавляем класс для плавного исчезновения
                // Слушатель для удаления элемента из DOM после завершения анимации
                toast.addEventListener('transitionend', () => {
                    if (toast.parentNode === toastContainer) { // Проверка, что элемент все еще в контейнере
                        toastContainer.removeChild(toast);
                    }
                }, { once: true }); // { once: true } чтобы слушатель сработал один раз

                // Fallback, если transitionend не сработает (например, если нет transition в CSS)
                setTimeout(() => {
                     if (toast.parentNode === toastContainer) {
                        toastContainer.removeChild(toast);
                    }
                }, 3600); // Чуть больше, чем длительность анимации hide
            }, 3000);
        } catch (error) {
            console.error("Error showing toast:", error);
        }
    }


    function filterProducts() {
        if (!productGrid) return;

        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const maxPrice = priceRange ? parseInt(priceRange.value, 10) : Infinity;
        const cards = productGrid.querySelectorAll('.card');

        const itemsToShow = [];
        const itemsToHide = [];

        cards.forEach(card => {
            const category = card.dataset.category;
            const basePrice = parseInt(card.dataset.price || 0, 10); // Используем базовую цену для фильтрации
            const name = card.querySelector('.product-name')?.textContent.toLowerCase() || '';

            const matchesCategory = activeCategory === 'all' || category === activeCategory;
            const matchesPrice = basePrice <= maxPrice;
            const matchesSearch = name.includes(searchTerm);

            const shouldBeVisible = matchesCategory && matchesPrice && matchesSearch;
            const isCurrentlyVisible = card.style.display !== 'none' && !card.classList.contains('card-hiding');


            if (isCurrentlyVisible && !shouldBeVisible) {
                itemsToHide.push(card);
            } else if (!isCurrentlyVisible && shouldBeVisible) {
                // Подготовка к появлению
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                card.style.display = ''; // Убираем display:none если было
                card.classList.remove('card-hiding');
                itemsToShow.push(card);
            } else if (isCurrentlyVisible && shouldBeVisible) {
                // Если уже видим и должен быть видим, убираем класс скрытия на всякий случай
                card.classList.remove('card-hiding');
                card.style.opacity = ''; // Сброс стилей анимации если они были
                card.style.transform = '';
            } else if (!isCurrentlyVisible && !shouldBeVisible) {
                // Если не видим и не должен быть видим, оставляем display:none или добавляем класс, если его нет
                card.style.display = 'none';
                card.classList.add('card-hiding'); // На всякий случай
            }
        });

        // Анимация скрытия
        itemsToHide.forEach(card => {
            card.classList.add('card-hiding');
            // Важно: display: none нужно установить после завершения анимации,
            // иначе анимация не будет видна.
             card.addEventListener('transitionend', function handler() {
                 if (card.classList.contains('card-hiding')) { // Проверяем, что класс все еще там
                    card.style.display = 'none';
                 }
                 card.removeEventListener('transitionend', handler); // Удаляем обработчик
             }, { once: true });
             // Fallback, если transitionend не сработает
             setTimeout(() => {
                if (card.classList.contains('card-hiding')) {
                    card.style.display = 'none';
                }
             }, 350); // Чуть больше времени анимации
        });

        // Анимация появления (используем requestAnimationFrame для лучшей производительности)
        requestAnimationFrame(() => {
            itemsToShow.forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        });
    }


    function updatePriceFilterValue() {
        if (priceValue && priceRange) {
            priceValue.textContent = `до ${priceRange.value} ₽`;
        }
        if (productGrid) { // Убедимся, что productGrid существует
            filterProducts();
        }
    }

    function filterCategory(category) {
        activeCategory = category;
        allNavContainers.forEach(container => {
            const navButtons = container.querySelectorAll('.category-button');
            navButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
        });
        if (productGrid) { // Убедимся, что productGrid существует
            filterProducts();
        }
        // Закрыть мобильное меню после выбора категории
        if (mobileNav?.classList.contains('active')) {
            toggleMobileMenu();
        }
    }

    function handleSizeSelection(selectedButton) {
        const card = selectedButton.closest('.card');
        if (!card) return;

        const priceElement = card.querySelector('.price');
        const addToCartButton = card.querySelector('.add-to-cart-btn');

        // Снимаем выделение со всех кнопок размеров в этой карточке
        card.querySelectorAll('.size-options button').forEach(btn => btn.classList.remove('selected'));
        // Выделяем нажатую кнопку
        selectedButton.classList.add('selected');

        // Обновляем цену на карточке и в data-атрибуте кнопки "В корзину"
        const newPrice = selectedButton.dataset.price;
        if (priceElement) {
            priceElement.textContent = `${newPrice} ₽`;
        }
        if (addToCartButton) {
            addToCartButton.dataset.price = newPrice; // Обновляем цену для кнопки
        }
    }

    function addToCart(name, price, imgElement, event, size = null) {
         if (event) event.stopPropagation(); // Предотвращаем всплытие события, если нужно

         const cartKey = size ? `${name} (${size})` : name; // Создаем уникальный ключ для товара (с размером, если есть)
         const numericPrice = parseFloat(price);

         if (isNaN(numericPrice)) {
             showToast(`Ошибка цены для товара "${name}"`, "error");
             return;
         }

         if (cart[cartKey]) {
             cart[cartKey].quantity++;
         } else {
             cart[cartKey] = {
                 quantity: 1,
                 price: numericPrice,
                 size: size, // Сохраняем размер
                 name: name  // Сохраняем оригинальное имя без размера для отображения
             };
         }
         showToast(`${name} ${size ? '('+size+')' : ''} добавлен в корзину!`, 'success');
         updateCartPopup();
    }

    function incrementCart(itemNameKey) {
        if (cart[itemNameKey]) {
            cart[itemNameKey].quantity++;
            updateCartPopup();
        }
    }

    function decrementCart(itemNameKey) {
        if (!cart[itemNameKey]) return;

        cart[itemNameKey].quantity--;

        if (cart[itemNameKey].quantity <= 0) {
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-key="${CSS.escape(itemNameKey)}"]`);
            if (itemElement) {
                 itemElement.classList.add('removing'); // Добавляем класс для анимации
                 const handleTransitionEnd = () => {
                    // Убедимся, что элемент все еще существует и является дочерним для cartItemsContainer
                    if (itemElement.parentNode === cartItemsContainer) {
                        itemElement.removeEventListener('transitionend', handleTransitionEnd); // Удаляем слушатель
                        delete cart[itemNameKey]; // Удаляем из объекта корзины
                        updateCartPopup(); // Обновляем отображение корзины
                    }
                 };
                 itemElement.addEventListener('transitionend', handleTransitionEnd, { once: true });

                 // Fallback на случай, если transitionend не сработает
                 setTimeout(() => {
                    if (cart[itemNameKey]?.quantity <= 0) { // Дополнительная проверка
                        delete cart[itemNameKey];
                        updateCartPopup();
                        if(itemElement.parentNode === cartItemsContainer) itemElement.remove(); // Удаляем элемент, если он еще там
                    }
                 }, 350); // Чуть больше времени анимации
                 return; // Выходим, чтобы не вызывать updateCartPopup() дважды сразу
            } else {
                 delete cart[itemNameKey]; // Если элемента нет, просто удаляем из корзины
            }
        }
        updateCartPopup(); // Обновляем в остальных случаях
    }

    function updateCartPopup() {
        if (!cartItemsContainer || !cartTotalElement || !cartCounter || !checkoutButton) {
            // Если основные элементы корзины не найдены, просто обновим счетчик на кнопке, если он есть
            if (cartCounter) {
                let itemCount = 0;
                Object.values(cart).forEach(item => itemCount += item.quantity);
                cartCounter.textContent = itemCount;
                cartCounter.style.display = itemCount > 0 ? 'inline-block' : 'none';
            }
            return;
        }

        const scrollTop = cartItemsContainer.scrollTop; // Сохраняем текущую прокрутку
        cartItemsContainer.innerHTML = ''; // Очищаем предыдущее содержимое
        let total = 0;
        let itemCount = 0;

        // Сортируем ключи для консистентного порядка отображения
        const sortedCartKeys = Object.keys(cart).sort();

        if (sortedCartKeys.length === 0) {
            cartPopup?.classList.add('empty'); // Добавляем класс, если корзина пуста
        } else {
            cartPopup?.classList.remove('empty'); // Убираем класс, если есть товары
            sortedCartKeys.forEach(key => {
                if (!cart[key] || cart[key].quantity <= 0) { // Пропускаем или удаляем "нулевые" товары
                    if(cart[key]) delete cart[key]; // Удаляем, если количество 0 или меньше
                    return;
                }
                const item = cart[key];
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                itemElement.dataset.key = key; // Используем ключ как data-атрибут

                // Отображаем имя с размером, если он есть
                const displayName = item.size ? `${item.name} (${item.size})` : item.name;

                itemElement.innerHTML = `
                    <span>${displayName}</span>
                    <div class="quantity-controls">
                        <button type="button" class="quantity-btn decrement-btn" data-item="${key}" aria-label="Уменьшить количество ${displayName}">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button type="button" class="quantity-btn increment-btn" data-item="${key}" aria-label="Увеличить количество ${displayName}">+</button>
                    </div>
                    <span class="item-price">${item.price * item.quantity} ₽</span>`;
                cartItemsContainer.appendChild(itemElement);

                total += item.price * item.quantity;
                itemCount += item.quantity;

                // Добавляем обработчики на кнопки +/-
                itemElement.querySelector('.decrement-btn')?.addEventListener('click', (e) => { e.stopPropagation(); decrementCart(key); });
                itemElement.querySelector('.increment-btn')?.addEventListener('click', (e) => { e.stopPropagation(); incrementCart(key); });
            });
        }

        cartTotalElement.textContent = `${total} ₽`;
        cartCounter.textContent = itemCount;
        cartCounter.style.display = itemCount > 0 ? 'inline-block' : 'none';
        checkoutButton.disabled = itemCount === 0;
        checkoutButton.style.opacity = itemCount === 0 ? '0.5' : '1'; // Визуальная индикация неактивности
        checkoutButton.style.cursor = itemCount === 0 ? 'not-allowed' : 'pointer';

        cartItemsContainer.scrollTop = scrollTop; // Восстанавливаем прокрутку
    }

    function toggleCartPopup() {
        if (!cartPopup) return;
        const isOpen = cartPopup.classList.toggle('active');
        document.body.style.overflow = isOpen ? 'hidden' : ''; // Блокируем скролл фона
        cartPopup.setAttribute('aria-hidden', String(!isOpen));
        if(isOpen) {
            cartPopup.focus(); // Фокус на попап для доступности
        } else {
            if (cartButton) cartButton.focus(); // Возвращаем фокус на кнопку корзины
        }
    }

    function clearCart() {
        if (!cartItemsContainer) { // Если контейнера нет, просто очищаем данные
            cart = {};
            updateCartPopup(); // Обновит счетчики и т.д.
            showToast('Корзина очищена', 'warning');
            return;
        }

        const items = cartItemsContainer.querySelectorAll('.cart-item') || [];
        let delay = 0;
        // Анимация удаления для каждого элемента
        items.forEach(item => {
            setTimeout(() => item.classList.add('removing'), delay);
            delay += 50; // Небольшая задержка для каскадного эффекта
        });

        // Очищаем корзину после завершения анимации
        setTimeout(() => {
            cart = {};
            updateCartPopup();
            showToast('Корзина очищена', 'warning');
        }, delay + 300); // 300ms - примерное время анимации 'removing'
    }

    function toggleMobileMenu() {
        if (!mobileNav || !mobileMenuToggle) return;

        const isActive = mobileNav.classList.toggle('active');
        document.body.style.overflow = isActive ? 'hidden' : ''; // Блокируем/разблокируем скролл страницы
        mobileMenuToggle.textContent = isActive ? '✕' : '☰'; // Меняем иконку гамбургера
        mobileMenuToggle.setAttribute('aria-expanded', String(isActive));
        mobileNav.setAttribute('aria-hidden', String(!isActive)); // Для доступности
    }

    function scrollNav(direction) { // direction: 1 для вправо, -1 для влево
       const scrollAmount = 200; // На сколько пикселей скроллить за раз
       if (scrollableNavContainer) { // Убедимся, что элемент существует
            scrollableNavContainer.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });
       }
    }

    function checkNavScroll() {
         if (!scrollableNavContainer || !scrollLeftBtn || !scrollRightBtn) {
             // console.warn("checkNavScroll: Aborting, one or more navigation elements are missing.");
             if (scrollLeftBtn) scrollLeftBtn.style.display = 'none'; // Скрываем кнопки если контейнер не найден
             if (scrollRightBtn) scrollRightBtn.style.display = 'none';
             return;
         }
         // console.log("checkNavScroll: Running for", scrollableNavContainer);

         // Даем браузеру время на отрисовку, особенно после динамических изменений
         setTimeout(() => {
            if (!scrollableNavContainer || !scrollLeftBtn || !scrollRightBtn) { // Повторная проверка внутри setTimeout
                // console.warn("checkNavScroll (in timeout): Aborting, elements missing after timeout.");
                return;
            }
             const { scrollLeft, scrollWidth, clientWidth } = scrollableNavContainer;
             // console.log("checkNavScroll (in timeout) values:", { scrollLeft, scrollWidth, clientWidth });

             // Показываем левую кнопку, если есть куда скроллить влево (с небольшим запасом)
             const showLeft = scrollLeft > 1;
             // Показываем правую кнопку, если есть куда скроллить вправо (с небольшим запасом)
             const showRight = scrollWidth > clientWidth + scrollLeft + 1;

             // console.log("checkNavScroll (in timeout) decisions:", { showLeft, showRight });

             scrollLeftBtn.style.display = showLeft ? 'flex' : 'none';
             scrollRightBtn.style.display = showRight ? 'flex' : 'none';
         }, 150); // Задержка для корректного расчета размеров
    }


    function checkoutOrder() {
        if (Object.keys(cart).length === 0) {
            showToast("Ваша корзина пуста!", "error");
            return;
        }
        if (!confirmationPopup || !confirmationOverlay) return;

        confirmationOverlay.classList.add('active');
        confirmationPopup.classList.add('visible');
        confirmationPopup.setAttribute('aria-hidden', 'false'); // Для доступности
        if (cartPopup?.classList.contains('active')) { // Закрываем попап корзины, если он открыт
            toggleCartPopup();
        }

        // Проверяем выбранный способ доставки при открытии
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
        if(addressSection && addressInput) { // Проверка на существование элементов
             addressSection.style.display = deliveryMethod === 'delivery' ? 'block' : 'none';
             addressInput.required = (deliveryMethod === 'delivery');
             if (deliveryMethod !== 'delivery') {
                addressInput.classList.remove('error'); // Убираем ошибку, если не доставка
             }
        }
        document.body.style.overflow = 'hidden'; // Блокируем скролл фона
        confirmationPopup.focus(); // Фокус на окно для доступности
    }

    function confirmOrder() {
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
        const address = addressInput ? addressInput.value.trim() : '';
        const comment = commentInput ? commentInput.value.trim() : '';
        const sticksCount = sticksInput ? (parseInt(sticksInput.value, 10) || 0) : 0; // Убедимся, что это число

        if (deliveryMethod === 'delivery' && address === '') {
            showToast('Пожалуйста, укажите адрес доставки.', 'error');
            if(addressInput) { // Проверка на существование
                addressInput.focus();
                addressInput.classList.add('error'); // Визуальное выделение ошибки
            }
            return;
        } else if (addressInput) {
            addressInput.classList.remove('error'); // Убираем выделение ошибки, если адрес введен или не требуется
        }

        let orderDetails = "Здравствуйте! Хочу сделать заказ:\n\n";
        let total = 0;
        Object.keys(cart).forEach(key => {
            const item = cart[key];
            const displayName = item.size ? `${item.name} (${item.size})` : item.name;
            orderDetails += `- ${displayName}: ${item.quantity} шт. x ${item.price} ₽ = ${item.quantity * item.price} ₽\n`;
            total += item.quantity * item.price;
        });
        orderDetails += `\nОбщая сумма: ${total} ₽\n`;
        orderDetails += `Палочки/Приборы: ${sticksCount} чел.\n`;
        orderDetails += `Способ получения: ${deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз'}\n`;
        if (deliveryMethod === 'delivery') {
            orderDetails += `Адрес: ${address}\n`;
        }
        orderDetails += `Способ оплаты: `;
        switch (paymentMethod) {
            case 'cash': orderDetails += 'Наличные'; break;
            case 'card': orderDetails += 'Карта курьеру'; break; // Изменено для ясности
            case 'online': orderDetails += 'Онлайн (Перевод)'; break;
            default: orderDetails += 'Не указан'; break;
        }
        orderDetails += '\n';
        if (comment) {
            orderDetails += `Комментарий: ${comment}\n`;
        }

        currentOrderDetailsForWhatsapp = orderDetails; // Сохраняем для следующего шага

        // Скрываем текущее окно и показываем окно предварительного подтверждения WhatsApp
        if(confirmationPopup) confirmationPopup.classList.remove('visible'); // Скрываем окно заказа
        if(preWhatsappConfirmationPopup) {
            preWhatsappConfirmationPopup.classList.add('visible'); // Показываем окно WhatsApp
            preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'false');
            preWhatsappConfirmationPopup.focus(); // Фокус на новое окно
        }
    }

    function proceedWithWhatsApp() {
        if (!currentOrderDetailsForWhatsapp) {
            showToast("Ошибка формирования заказа. Попробуйте снова.", "error");
            return;
        }
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(currentOrderDetailsForWhatsapp)}`;
        window.open(whatsappUrl, '_blank'); // Открываем WhatsApp в новой вкладке

        // Закрываем все попапы
        if(preWhatsappConfirmationPopup) {
            preWhatsappConfirmationPopup.classList.remove('visible');
            preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true');
        }
        if(confirmationPopup) { // Также убедимся, что и основной попап заказа скрыт
            confirmationPopup.classList.remove('visible');
            confirmationPopup.setAttribute('aria-hidden', 'true');
        }
        if(confirmationOverlay) confirmationOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Возвращаем скролл

        clearCart(); // Очищаем корзину
        showToast('Заказ сформирован и перенаправлен в WhatsApp!', 'success');

        // Сброс полей формы заказа
        if(addressInput) addressInput.value = '';
        if(commentInput) commentInput.value = '';
        const pickupRadio = document.querySelector('input[name="delivery"][value="pickup"]');
        if (pickupRadio) pickupRadio.checked = true;
        const cashRadio = document.querySelector('input[name="payment"][value="cash"]');
        if (cashRadio) cashRadio.checked = true;
        if(addressSection) addressSection.style.display = 'none'; // Скрываем секцию адреса
        if(addressInput) addressInput.classList.remove('error'); // Убираем ошибку с поля адреса
        currentOrderDetailsForWhatsapp = ''; // Очищаем детали заказа
    }

    function cancelPreWhatsappRedirect() {
        if(preWhatsappConfirmationPopup) {
            preWhatsappConfirmationPopup.classList.remove('visible');
            preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true');
        }
        // Возвращаем пользователя к основному окну подтверждения заказа
        if(confirmationPopup) {
            confirmationPopup.classList.add('visible');
            confirmationPopup.focus();
        }
    }


    function cancelOrder() { // Используется для обоих попапов подтверждения
        if(confirmationPopup) {
            confirmationPopup.classList.remove('visible');
            confirmationPopup.setAttribute('aria-hidden', 'true');
        }
        if(preWhatsappConfirmationPopup) { // Также закрываем попап WhatsApp, если он был открыт
            preWhatsappConfirmationPopup.classList.remove('visible');
            preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true');
        }
        if(confirmationOverlay) confirmationOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Возвращаем скролл
        if(addressInput) addressInput.classList.remove('error'); // Убираем ошибку с поля адреса
        if(cartButton && cartButton.style.display !== 'none') cartButton.focus(); // Возвращаем фокус на кнопку корзины, если она видима
    }

    function initSlider() {
        if (!sliderTrack) return; // Если слайдера нет на странице, выходим

        const sliderItems = sliderTrack.querySelectorAll('.slider-item');
        if (sliderItems.length <= 1) return; // Если слайдов мало, не запускаем

        let currentSlide = 0;
        let intervalId = setInterval(() => {
            currentSlide = (currentSlide + 1) % sliderItems.length;
            sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        }, 3000); // Меняем слайд каждые 3 секунды

        // Пауза при наведении мыши
        sliderTrack.addEventListener('mouseenter', () => clearInterval(intervalId));
        sliderTrack.addEventListener('mouseleave', () => {
            intervalId = setInterval(() => {
                currentSlide = (currentSlide + 1) % sliderItems.length;
                sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            }, 3000);
        });
    }

    function initShapes() {
        if (!shapesContainer) return;
        const shapes = shapesContainer.querySelectorAll('.shape');
        if (shapes.length === 0) return;

        let shapeData = [];
        shapes.forEach(shape => {
            const rect = shape.getBoundingClientRect();
            const shapeWidth = rect.width || 50; // Fallback, если getBoundingClientRect не сработал до полной отрисовки
            const shapeHeight = rect.height || 50;

            const x = Math.random() * (window.innerWidth - shapeWidth);
            const y = Math.random() * (window.innerHeight - shapeHeight);
            const dx = (Math.random() * 2 - 1) * 0.5;  // Скорость и направление по X (медленнее)
            const dy = (Math.random() * 2 - 1) * 0.5;  // Скорость и направление по Y (медленнее)

            shape.style.left = `${x}px`;
            shape.style.top = `${y}px`;
            shape.style.transform = `translate(0px, 0px)`; // Начальное смещение через transform

            shapeData.push({
                element: shape, x, y, dx, dy,
                width: shapeWidth, height: shapeHeight,
                initialX: x, initialY: y // Сохраняем начальные координаты для transform
            });
        });

        let animationFrameId = null;

        function updateShapes() {
            shapeData.forEach(data => {
                data.x += data.dx;
                data.y += data.dy;

                // Отскок от краев окна
                if (data.x < 0 || data.x + data.width > window.innerWidth) {
                    data.dx = -data.dx;
                    data.x = Math.max(0, Math.min(data.x, window.innerWidth - data.width)); // Коррекция положения
                }
                if (data.y < 0 || data.y + data.height > window.innerHeight) {
                    data.dy = -data.dy;
                    data.y = Math.max(0, Math.min(data.y, window.innerHeight - data.height)); // Коррекция положения
                }
                // Используем transform для смещения относительно начальной позиции
                const translateX = data.x - data.initialX;
                const translateY = data.y - data.initialY;
                data.element.style.transform = `translate(${translateX}px, ${translateY}px)`;
            });
            animationFrameId = requestAnimationFrame(updateShapes);
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // Отменяем предыдущую анимацию, если есть
        animationFrameId = requestAnimationFrame(updateShapes);

        // Пауза анимации, если вкладка не активна
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (animationFrameId) cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            } else {
                if (!animationFrameId) animationFrameId = requestAnimationFrame(updateShapes);
            }
        });
    }

    // --- Attaching Event Listeners ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(filterProducts, 300); // Задержка для уменьшения нагрузки при быстром вводе
        });
    }
    if (searchButton) {
        searchButton.addEventListener('click', filterProducts);
    }
    if (priceRange) {
        let priceTimeout;
        priceRange.addEventListener('input', () => { // Обновляем текст сразу
            if (priceValue) priceValue.textContent = `до ${priceRange.value} ₽`;
            clearTimeout(priceTimeout);
            priceTimeout = setTimeout(updatePriceFilterValue, 150); // Фильтруем с небольшой задержкой
        });
    }

    allNavContainers.forEach(container => {
        container.addEventListener('click', (event) => {
            const button = event.target.closest('.category-button');
            if (button?.dataset.category) { // Убедимся, что кнопка и атрибут существуют
                filterCategory(button.dataset.category);
            }
        });
    });

    if (productGrid) { // Проверяем, существует ли productGrid
        productGrid.addEventListener('click', (event) => {
            const card = event.target.closest('.card');
            if (!card) return; // Клик не по карточке или ее содержимому

            const addButton = event.target.closest('.add-to-cart-btn');
            const sizeButton = event.target.closest('.size-options button');

            if (sizeButton) { // Клик по кнопке выбора размера
                handleSizeSelection(sizeButton);
                return; // Прерываем, чтобы не обработался как клик по карточке в целом
            }

            if (addButton) { // Клик по кнопке "В корзину"
                const nameElement = card.querySelector('.product-name');
                const name = nameElement ? nameElement.textContent : 'Неизвестный товар';
                const price = parseFloat(addButton.dataset.price); // Берем цену из кнопки (обновляется при выборе размера)
                const img = card.querySelector('img'); // Для возможной анимации или передачи в корзину

                // Определяем выбранный размер, если есть
                const selectedSizeElement = card.querySelector('.size-options .selected');
                const size = selectedSizeElement ? selectedSizeElement.dataset.size : null;

                addToCart(name, price, img, event, size);
                return; // Прерываем
            }

            // --- НАЧАЛО ИЗМЕНЕННОЙ ЛОГИКИ ---
            // Если клик был по карточке, но не по кнопкам размера или "В корзину"
            const descriptionElement = card.querySelector('.product-description');
            if (descriptionElement) {
                // Проверяем текущее состояние display (может быть '' если не установлено инлайн)
                // или берем вычисленный стиль, если он установлен через CSS
                const isHidden = descriptionElement.style.display === 'none' || 
                                 getComputedStyle(descriptionElement).display === 'none';
                
                if (isHidden) {
                    descriptionElement.style.display = 'block'; // Показываем описание
                } else {
                    descriptionElement.style.display = 'none';  // Скрываем описание
                }
            }
            // --- КОНЕЦ ИЗМЕНЕННОЙ ЛОГИКИ ---
            
            // console.log('Clicked on card:', card.dataset.id); // Эту строку можно оставить или удалить
        });
    }

    if (cartButton && cartButton.style.display !== 'none') { // Добавляем обработчик только если кнопка видима (не на about.html)
        cartButton.addEventListener('click', toggleCartPopup);
    }
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', toggleCartPopup);
    }
    if (clearCartButton) {
        clearCartButton.addEventListener('click', clearCart);
    }
    if (checkoutButton) {
        checkoutButton.addEventListener('click', checkoutOrder);
    }
    if (confirmOrderButton) {
        confirmOrderButton.addEventListener('click', confirmOrder);
    }
    if (cancelOrderButton) {
        cancelOrderButton.addEventListener('click', cancelOrder);
    }
    if (proceedToWhatsAppButton) {
        proceedToWhatsAppButton.addEventListener('click', proceedWithWhatsApp);
    }
    if (cancelPreWhatsAppButton) {
        cancelPreWhatsAppButton.addEventListener('click', cancelPreWhatsappRedirect);
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    if (scrollLeftBtn) { // Проверяем существование кнопки
        scrollLeftBtn.addEventListener('click', () => scrollNav(-1));
    }
    if (scrollRightBtn) { // Проверяем существование кнопки
        scrollRightBtn.addEventListener('click', () => scrollNav(1));
    }
    if (scrollableNavContainer) { // Проверяем существование контейнера
        scrollableNavContainer.addEventListener('scroll', checkNavScroll, { passive: true }); // Оптимизация скролла
        window.addEventListener('resize', checkNavScroll); // Обновляем при изменении размера окна
    }

    if(deliveryRadios && deliveryRadios.length > 0) { // Проверка на существование
        deliveryRadios.forEach(radio => {
            radio.addEventListener('change', (event) => {
                if (!addressSection || !addressInput) return; // Доп. проверка внутри обработчика
                const isDelivery = event.target.value === 'delivery';
                addressSection.style.display = isDelivery ? 'block' : 'none';
                addressInput.required = isDelivery;
                if (!isDelivery) {
                    addressInput.classList.remove('error'); // Убираем ошибку, если доставка не выбрана
                }
            });
        });
    }
    if (addressInput) { // Проверка на существование
        addressInput.addEventListener('input', () => { // Убираем ошибку при вводе
            if (addressInput.value.trim() !== '') {
                addressInput.classList.remove('error');
            }
        });
    }


    // --- Initializations ---
    console.log("Initializing components...");
    if (productGrid) { // Только если мы на странице с меню
        loadAndDisplayMenu();
    }
    if (sliderTrack) { // Только если слайдер есть на странице
        initSlider();
    }
    if (shapesContainer) { // Инициализация фигур, если они есть
        initShapes();
    }
    
    // Вызываем checkNavScroll для scrollableNavContainer если он существует,
    // так как категории в HTML статичны и их ширина известна после загрузки DOM.
    if (scrollableNavContainer) {
        // console.log("Calling checkNavScroll on DOMContentLoaded for static categories.");
        checkNavScroll();
    }
    
    // Скрываем основную кнопку корзины (круглая в углу) на странице "О нас"
    if (window.location.pathname.includes('about.html')) {
        // Основная круглая кнопка корзины имеет id "cartButton", но также класс "cart-icon"
        // В about.html используется другая кнопка корзины в шапке с id="cartButton" и классом "cart-icon"
        // Это может вызвать путаницу. Предположим, мы хотим скрыть ФИКСИРОВАННУЮ кнопку.
        const fixedCartButton = document.querySelector('.cart-icon:not(.header-controls .cart-icon)'); // Ищем фиксированную, не в header-controls
        if (fixedCartButton) {
            // fixedCartButton.style.display = 'none';
        }
        // Если на about.html кнопка корзины в хедере должна работать как на главной:
        const headerCartButtonAbout = document.querySelector('header#cartButton.cart-icon');
        if (headerCartButtonAbout) {
            headerCartButtonAbout.addEventListener('click', toggleCartPopup);
        }

    } else {
         // Если не на about.html, и есть фиксированная кнопка корзины, убедимся что она обрабатывает клики
         const fixedCartIcon = document.querySelector('button#cartButton.cart-icon'); // Это более точный селектор для фиксированной кнопки на index.html
         if (fixedCartIcon && !fixedCartIcon.closest('.header-controls')) { // Убедимся что это не кнопка в хэдере
            // Обработчик уже должен быть назначен выше, если fixedCartIcon это и есть `cartButton`
         }
    }
    updateCartPopup(); // Первоначальное обновление состояния корзины
    console.log("Script initialization complete.");
});