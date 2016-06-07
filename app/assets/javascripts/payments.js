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