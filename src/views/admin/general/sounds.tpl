<div class="sounds" class="row">
	<div class="col-lg-9">
		<form role="form">
			<div class="panel panel-default">
				<div class="panel-heading">General</div>
				<div class="panel-body">
					<label for="notification">Notifications</label>
					<div class="row">
						<div class="form-group col-xs-9">
							<select class="form-control" id="notification" name="notification">
								<option value=""></option>
								<!-- BEGIN sounds -->
								<option value="{sounds.name}">{sounds.name}</option>
								<!-- END sounds -->
							</select>
						</div>
						<div class="btn-group col-xs-3">
							<button type="button" class="form-control btn btn-sm btn-default" data-action="play">Play <i class="fa fa-play"></i></button>
						</div>
					</div>
				</div>
			</div>

			<div class="panel panel-default">
				<div class="panel-heading">Chat</div>
				<div class="panel-body">
					<label for="chat-incoming">Incoming Message</label>
					<div class="row">
						<div class="form-group col-xs-9">
							<select class="form-control" id="chat-incoming" name="chat-incoming">
								<option value=""></option>
								<!-- BEGIN sounds -->
								<option value="{sounds.name}">{sounds.name}</option>
								<!-- END sounds -->
							</select>
						</div>
						<div class="btn-group col-xs-3">
							<button type="button" class="form-control btn btn-sm btn-default" data-action="play">Play <i class="fa fa-play"></i></button>
						</div>
					</div>

					<label for="chat-outgoing">Outgoing Message</label>
					<div class="row">
						<div class="form-group col-xs-9">
							<select class="form-control" id="chat-outgoing" name="chat-outgoing">
								<option value=""></option>
								<!-- BEGIN sounds -->
								<option value="{sounds.name}">{sounds.name}</option>
								<!-- END sounds -->
							</select>
						</div>
						<div class="btn-group col-xs-3">
							<button type="button" class="form-control btn btn-sm btn-default" data-action="play">Play <i class="fa fa-play"></i></button>
						</div>
					</div>
				</div>
			</div>
		</form>
	</div>

	<div class="col-lg-3">
		<div class="panel panel-default">
			<div class="panel-heading">Sounds Control Panel</div>
			<div class="panel-body">
				<button class="btn btn-primary" id="save">Save Sound Settings</button>
			</div>
		</div>
	</div>
</div>