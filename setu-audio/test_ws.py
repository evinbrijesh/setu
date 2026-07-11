import asyncio
import websockets
import json
import os
import uuid

async def main():
    uri = "ws://localhost:8000/ws/audio"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully.")
            
            # Generate a valid UUID for testing
            test_uuid = str(uuid.uuid4())
            
            # 1. Send start_session
            start_payload = {
                "type": "start_session",
                "user_id": test_uuid,
                "language_code": "hi-IN"
            }
            await websocket.send(json.dumps(start_payload))
            
            # Receive session_started
            response = await websocket.recv()
            print(f"Received started confirmation: {response}")
            
            # 2. Send text utterance turn (to verify fallback & trigger workflows)
            text_payload = {
                "type": "text_utterance",
                "text": "Mujhe PM Kisan ke liye apply karna hai",
                "language_code": "hi-IN"
            }
            await websocket.send(json.dumps(text_payload))
            print("Sent utterance: 'Mujhe PM Kisan ke liye apply karna hai'")
            
            # 3. Receive responses
            print("Awaiting responses...")
            for i in range(5):
                msg = await websocket.recv()
                if isinstance(msg, str):
                    print(f"Received JSON [{i}]: {msg}")
                else:
                    print(f"Received Audio Binary [{i}]: {len(msg)} bytes")
                    
    except Exception as e:
        print(f"WebSocket client error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
