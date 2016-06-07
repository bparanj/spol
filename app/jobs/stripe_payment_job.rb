class StripePaymentJob < ApplicationJob
  queue_as :default

  def perform(*args)
    # Do payment processing here
  end
end
