Processing Stripe Payments with a Background Worker in Rails 5

Create a background job class to process payments.

```
rails g job stripe_payment
```

The `app/jobs/stripe_payment_job.rb` looks like this:

```ruby
class StripePaymentJob < ApplicationJob
  queue_as :default

  def perform(*args)
    # Do payment processing here
  end
end
```

Add resque gem to Gemfile and run bundle.

```ruby
gem 'resque'
```

In application.rb, specify the queue_adapter:

```ruby
config.active_job.queue_adapter = :resque
```

Create a controller for processing payments.

```
rails g controller payments create
```

This controller will take the stripe token and payment id in the create action and process the payment in the background.

```ruby
class PaymentsController < ApplicationController
  def create
    StripePaymentJob.perform_later('process payment later')
  end
end
```

It is sending only a string argument. You can send the stripe token and payment id in a hash to the `perform_later` method. Start the rails server and hit `http://localhost:3000/payments/create`. You will see:

```
Started GET "/payments/create" for ::1 at 2016-06-07 13:39:45 -0700
Processing by PaymentsController#create as HTML
[ActiveJob] Enqueued StripePaymentJob (Job ID: 3b3ab29c-5978-4f70-912f-bf5ec0e8a98e) to Resque(default) with arguments: "process payment later"
```

in the log file. Poll the server every 5 second. The ajax call is made to payments/show to check the status of the payment.

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show", success: function(data){
        //Setup the next poll recursively
        poll();
      }, dataType: "json"});
  }, 5000);
})();
```

Let's hard code the result to success in the payments controller, show action.

```ruby
def show
  render json: { result: 'success'}
end
```

We can now handle the success, failure and pending states in the payment.js.

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show", success: function(data){
		console.log(data.result);
		if(data.result === 'success') {
			alert('It was success');
		} else if (data.result === 'failure') {
			alert('It failed');
		} else if (data.result === 'pending') {
	        //Setup the next poll recursively
	        poll();			
		}
      }, dataType: "json"});
  }, 5000);
})();
```

We continue polling only when the payment is in pending state. We can simulate a failure in the show action to test if the poll stops for failure.

```ruby
def show
  render json: { result: 'failure'}
end
```

We can add the payment status messages to notify the customer about the payment status.

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show", 
		beforeSend: function() {
	       $('#loader').show();
	    },		
	   success: function(data){
		console.log(data.result);
		if(data.result === 'success') {
			$('#loader').hide();
			$('#status').html('Payment processed successfully.')
		} else if (data.result === 'failure') {
			$('#loader').hide();
            $('#status').html('Payment processing failed.')
		} else if (data.result === 'pending') {
	        //Setup the next poll recursively
	        poll();			
		}
      }, dataType: "json"});
  }, 5000);
})();
```

## How to pass the payment id from Rails to javascript?

Let's hardcode the payment id in the payments controller, create action.

```ruby
def create
  @payment = OpenStruct.new(id: 200)
  StripePaymentJob.perform_later('process payment later')
end
```

We can use the javascript window object to set the paymentID in create.html.erb.

```html
<h1>Payments#create</h1>
<%= javascript_tag do %>
  window.paymentID = '<%= @payment.id %>';
<% end %>
<div id='loader'>
	<img src="http://preloaders.net/preloaders/712/Floating%20rays.gif"/>
</div>
<div id='status'>Payment is being processed. Please wait...</div>
```

Change the show action to fail.

```ruby
def show
  logger.info params
  render json: { result: 'failure'}
end
```

We can now access the paymentID that was set in the create.html.erb in the payment.js to poll the payment status.

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show/" + paymentID,
		beforeSend: function() {
	       $('#loader').show();
		   console.log(paymentID);
	    },		
	   success: function(data){
		console.log(data.result);
		if(data.result === 'success') {
			$('#loader').hide();
			$('#status').html('Payment processed successfully.')
		} else if (data.result === 'failure') {
			$('#loader').hide();
            $('#status').html('Payment processing failed.')
		} else if (data.result === 'pending') {
	        //Setup the next poll recursively
	        poll();			
		}
      }, dataType: "json"});
  }, 5000);
})();
```

You will get the error:

```
GET http://localhost:3000/payments/show/200 404 (Not Found)
```

Let's define the routes properly.

```ruby
get 'payments/show/:id', to: 'payments#show'
```

We can now see the payment id passed to the server.

```
Started GET "/payments/show/200" for ::1 at 2016-06-07 15:52:20 -0700
Processing by PaymentsController#show as JSON
  Parameters: {"id"=>"200"}
```

We can use the payment id to check the current status of the payment by loading it from the database. Let's display the receipt id on payment success. 

```javascript
$('#status').html('Payment processed successfully. Your receipt ID is : ' + data.receipt_id);
```

We can hard-code the `receipt_id` in the show action.

```ruby
def show
  logger.info params
  render json: { result: 'success', receipt_id: 'CXM4873'}
end
```

## Replace hard coded URL in the javascript.

Let's use HTML 5 data attribute so that we can get rid of the window object hack we did earlier.

```html
<div id='loader' data-url="<%= payments_show_url(@payment.id) %>">
	<img src="http://preloaders.net/preloaders/712/Floating%20rays.gif"/>
</div>
```

Make the route a named url that we can use in the view.

```
get 'payments/show/:id', to: 'payments#show', as: :payments_show
```

Let's cleanup. Remove paymentID hack to pass value from rails to javascript.

```html
<h1>Payments#create</h1>
<div id='loader' data-url="<%= payments_show_url(@payment.id) %>">
	<img src="http://preloaders.net/preloaders/712/Floating%20rays.gif"/>
</div>
<div id='status'>Payment is being processed. Please wait...</div>
```

The final payment.js looks like this:

```javascript
(function poll(){
   setTimeout(function(){
	   $.ajax({ url: $('#loader').data('url'), 
		beforeSend: function() {
	       $('#loader').show();
	    },		
	   success: function(data){
		console.log(data.result);
		if(data.result === 'success') {
			$('#loader').hide();
			$('#status').html('Payment processed successfully. Your receipt ID is : ' + data.receipt_id);
		} else if (data.result === 'failure') {
			$('#loader').hide();
            $('#status').html('Payment processing failed.')
		} else if (data.result === 'pending') {
	        //Setup the next poll recursively
	        poll();			
		}
      }, dataType: "json"});
  }, 5000);
})();
```

Replace the hard coded value for the json returned in the show action with the values of the payment record for a given payment id from the javascript poll request. You can download the source code for this article from [Poll]( 'Poll')

## References

- [Simple Long Polling Example with JavaScript and jQuery](https://techoctave.com/c7/posts/60-simple-long-polling-example-with-javascript-and-jquery   'Simple Long Polling Example with JavaScript and jQuery')
- [Design for Failure: Processing Payments with a Background Worker](https://www.masteringmodernpayments.com/blog/design-for-failure-processing-payments-with-a-background-worker 'Design for Failure: Processing Payments with a Background Worker')


The payment.js that shows spinner and the payment status:

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show", 
		beforeSend: function() {
	       $('#loader').show();
		   console.log(paymentID);
	    },		
	   success: function(data){
		console.log(data.result);
		
		if(data.result === 'success') {
			$('#loader').hide();
			$('#status').html('Payment processed successfully.')
		} else if (data.result === 'failure') {
			$('#loader').hide();
            $('#status').html('Payment processing failed.')
		} else if (data.result === 'pending') {
	        //Setup the next poll recursively
	        poll();			
		}
      }, dataType: "json"});
  }, 5000);
})();
```
