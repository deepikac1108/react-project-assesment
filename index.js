document.addEventListener('DOMContentLoaded', () => {
  const API = (() => {
      const URL = "http://localhost:3001";

      const getCart = () => fetch(`${URL}/cart`).then(res => res.json());
      const getInventory = () => fetch(`${URL}/inventory`).then(res => res.json());

      const addToCart = (item) => fetch(`${URL}/cart`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify(item)
      }).then(res => res.json());

      const updateCart = (id, newAmount) => fetch(`${URL}/cart/${id}`, {
          method: 'PATCH',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount: newAmount })
      }).then(res => res.json());

      const deleteFromCart = (id) => fetch(`${URL}/cart/${id}`, {
          method: 'DELETE'
      }).then(res => res.json());

      return {
          getCart,
          getInventory,
          addToCart,
          updateCart,
          deleteFromCart
      };
  })();

  const Model = (() => {
      class State {
          #onChange;
          #inventory;
          #cart;
          constructor() {
              this.#inventory = [];
              this.#cart = [];
          }

          get cart() {
              return this.#cart;
          }

          get inventory() {
              return this.#inventory;
          }

          set cart(newCart) {
              this.#cart = newCart;
              this.#onChange();
          }

          set inventory(newInventory) {
              this.#inventory = newInventory;
              this.#onChange();
          }

          subscribe(cb) {
              this.#onChange = cb;
          }
      }

      return {
          State,
          ...API
      };
  })();

  const View = (() => {
      const renderInventory = (inventory) => {
          const inventoryContainer = document.querySelector('.inventory-container ul');
          inventoryContainer.innerHTML = '';
          inventory.forEach(item => {
              const li = document.createElement('li');
              li.innerHTML = `
                  ${item.content} - <button class="decrement" data-id="${item.id}">-</button> 
                  <span>${item.amount || 0}</span> 
                  <button class="increment" data-id="${item.id}">+</button> 
                  <button class="add-to-cart" data-id="${item.id}">Add to cart</button>`;
              inventoryContainer.appendChild(li);
          });
      };

      const renderCart = (cart) => {
          const cartContainer = document.querySelector('.cart-container ul');
          cartContainer.innerHTML = '';
          cart.forEach(item => {
              const li = document.createElement('li');
              li.innerHTML = `
                  ${item.content} x ${item.amount} 
                  <button class="delete-from-cart" data-id="${item.id}">Delete</button>`;
              cartContainer.appendChild(li);
          });
      };

      return {
          renderInventory,
          renderCart
      };
  })();

  const Controller = ((model, view) => {
      const state = new model.State();

      const init = () => {
          model.getInventory().then(data => {
              state.inventory = data;
              view.renderInventory(state.inventory);
          });

          model.getCart().then(data => {
              state.cart = data;
              view.renderCart(state.cart);
          });

          setupEventListeners();
      };

      const setupEventListeners = () => {
          document.querySelector('.inventory-container ul').addEventListener('click', handleInventoryClick);
          document.querySelector('.cart-container ul').addEventListener('click', handleCartClick);
          document.querySelector('.checkout-btn').addEventListener('click', handleCheckout);
      };

      const handleInventoryClick = (event) => {
          const target = event.target;
          if (target.classList.contains('increment')) {
              incrementItem(target.dataset.id);
          } else if (target.classList.contains('decrement')) {
              decrementItem(target.dataset.id);
          } else if (target.classList.contains('add-to-cart')) {
              addToCart(target.dataset.id);
          }
      };

      const incrementItem = (id) => {
          const item = state.inventory.find(item => item.id == id);
          item.amount = (item.amount || 0) + 1;
          view.renderInventory(state.inventory);
      };

      const decrementItem = (id) => {
          const item = state.inventory.find(item => item.id == id);
          if (item.amount > 0) {
              item.amount--;
              view.renderInventory(state.inventory);
          }
      };

      const addToCart = (id) => {
          const item = state.inventory.find(item => item.id == id);
          if (item.amount > 0) {
              const cartItem = state.cart.find(cartItem => cartItem.id == id);
              if (cartItem) {
                  cartItem.amount += item.amount;
                  model.updateCart(cartItem.id, cartItem.amount).then(() => {
                      view.renderCart(state.cart);
                  });
              } else {
                  const newItem = { ...item, amount: item.amount };
                  state.cart.push(newItem);
                  model.addToCart(newItem).then(() => {
                      view.renderCart(state.cart);
                  });
              }
              item.amount = 0; // Reset inventory item amount after adding to cart
              view.renderInventory(state.inventory);
          }
      };

      const handleCartClick = (event) => {
          const target = event.target;
          if (target.classList.contains('delete-from-cart')) {
              deleteFromCart(target.dataset.id);
          }
      };

      const deleteFromCart = (id) => {
          state.cart = state.cart.filter(item => item.id != id);
          model.deleteFromCart(id).then(() => {
              view.renderCart(state.cart);
          });
      };

      const handleCheckout = () => {
          model.getCart().then(data => {
              data.forEach(item => {
                  model.deleteFromCart(item.id).then(() => {
                      state.cart = [];
                      view.renderCart(state.cart);
                  });
              });
          });
      };

      return {
          init
      };
  })(Model, View);

  Controller.init();
});