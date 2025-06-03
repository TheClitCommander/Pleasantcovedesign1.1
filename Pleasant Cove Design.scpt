on run
	try
		set projectPath to "/Users/bendickinson/Desktop/Pleasantcovedesign-main"
		
		display notification "Starting Pleasant Cove Design..." with title "App Launcher"
		
		tell application "Terminal"
			activate
			do script "cd '" & projectPath & "' && pkill -f 'tsx server' 2>/dev/null; npm run dev"
		end tell
		
		delay 8
		
		do shell script "open http://localhost:5173"
		
		display notification "Pleasant Cove Design is ready!" with title "App Launcher"
		
	on error errorMessage
		display dialog "Error: " & errorMessage buttons {"OK"} with icon stop
	end try
end run 