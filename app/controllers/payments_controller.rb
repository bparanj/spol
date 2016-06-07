class PaymentsController < ApplicationController
  def create
    @payment = OpenStruct.new(id: 200)
    StripePaymentJob.perform_later('process payment later')
  end
  
  def show
    logger.info params
    render json: { result: 'success', receipt_id: 'CXM4873'}
  end
end
