rails g job stripe_payment

app/jobs/stripe_payment_job.rb

```ruby
class StripePaymentJob < ApplicationJob
  queue_as :default

  def perform(*args)
    # Do payment processing here
  end
end
```

```
gem 'resque'
```

bundle

In application.rb:

```ruby
config.active_job.queue_adapter = :resque
```

```
rails g controller payments create
```

```ruby
class PaymentsController < ApplicationController
  def create
    StripePaymentJob.perform_later('process payment later')
  end
end
```


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

Start the rails server and hit `http://localhost:3000/payments/create`. You will see:

```
Started GET "/payments/create" for ::1 at 2016-06-07 13:39:45 -0700
Processing by PaymentsController#create as HTML
[ActiveJob] Enqueued StripePaymentJob (Job ID: 3b3ab29c-5978-4f70-912f-bf5ec0e8a98e) to Resque(default) with arguments: "process payment later"
```

in the log file.

Poll the server every 5 second. The ajax call is made to payments/show to check the status of the payment.

```javascript
(function poll(){
   setTimeout(function(){
      $.ajax({ url: "show", success: function(data){
        // alert(JSON.stringify(data));

        //Setup the next poll recursively
        poll();
      }, dataType: "json"});
  }, 5000);
})();
```

```ruby
def show
  render json: { result: 'success'}
end
```

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

```ruby
def show
  render json: { result: 'failure'}
end
```


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

How to pass the payment id from Rails to javascript?

```ruby
def create
  @payment = OpenStruct.new(id: 200)
  StripePaymentJob.perform_later('process payment later')
end
```

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



```ruby
def show
  logger.info params
  render json: { result: 'failure'}
end
```

Pass payment Id to the server to check the status of the payment.

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

```
GET http://localhost:3000/payments/show/200 404 (Not Found)
```

```ruby
get 'payments/show/:id', to: 'payments#show'
```

```
Started GET "/payments/show/200" for ::1 at 2016-06-07 15:52:20 -0700
Processing by PaymentsController#show as JSON
  Parameters: {"id"=>"200"}
```
 
Display the receipt id on payment success. 

```javascript
$('#status').html('Payment processed successfully. Your receipt ID is : ' + data.receipt_id);
```

```ruby
def show
  logger.info params
  render json: { result: 'success', receipt_id: 'CXM4873'}
end
```

Replace hard coded URL in the javascript.

```html
<div id='loader' data-url="<%= payments_show_url(@payment.id) %>">
	<img src="http://preloaders.net/preloaders/712/Floating%20rays.gif"/>
</div>
```

```
get 'payments/show/:id', to: 'payments#show', as: :payments_show
```

Cleanup. Remove paymentID hack to pass value from rails to javascript.

```html
<h1>Payments#create</h1>
<div id='loader' data-url="<%= payments_show_url(@payment.id) %>">
	<img src="http://preloaders.net/preloaders/712/Floating%20rays.gif"/>
</div>
<div id='status'>Payment is being processed. Please wait...</div>
```

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

Replace the hard coded value for the json returned in the show action with the values of the payment record for the given id from the javascript poll request.

## References

- [Simple Long Polling Example with JavaScript and jQuery]
(https://techoctave.com/c7/posts/60-simple-long-polling-example-with-javascript-and-jquery 'Simple Long Polling Example with JavaScript and jQuery')

- [Design for Failure: Processing Payments with a Background Worker](https://www.masteringmodernpayments.com/blog/design-for-failure-processing-payments-with-a-background-worker 'Design for Failure: Processing Payments with a Background Worker')
