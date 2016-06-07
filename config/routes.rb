Rails.application.routes.draw do
  get 'payments/create'
  get 'payments/show/:id', to: 'payments#show', as: :payments_show
end
