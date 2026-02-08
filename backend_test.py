#!/usr/bin/env python3
"""
Backend API Testing Script for Short Video Mobile Game AI Generator
Tests all backend endpoints with proper error handling and detailed reporting.
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Base URL from frontend environment
BASE_URL = "https://game-gen-studio.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test configuration
TIMEOUT = 30  # seconds for regular requests
LONG_TIMEOUT = 60  # seconds for AI generation requests

class TestResult:
    def __init__(self):
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.results = []
    
    def add_test(self, endpoint: str, success: bool, details: str, response_data: Any = None):
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            self.failed_tests += 1
            status = "❌ FAIL"
        
        self.results.append({
            'endpoint': endpoint,
            'status': status,
            'details': details,
            'response_data': response_data
        })
        print(f"{status} {endpoint}: {details}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print("BACKEND API TESTING SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Success Rate: {(self.passed_tests/self.total_tests)*100:.1f}%" if self.total_tests > 0 else "N/A")
        
        if self.failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.results:
                if "❌" in result['status']:
                    print(f"- {result['endpoint']}: {result['details']}")

def make_request(method: str, endpoint: str, data: Optional[Dict] = None, timeout: int = TIMEOUT) -> tuple:
    """Make HTTP request and return (success, response_data, error_message)"""
    url = f"{API_BASE}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, timeout=timeout, 
                                   headers={'Content-Type': 'application/json'})
        else:
            return False, None, f"Unsupported method: {method}"
        
        # Check if response is successful
        if response.status_code >= 200 and response.status_code < 300:
            try:
                response_data = response.json()
                return True, response_data, None
            except json.JSONDecodeError:
                return True, response.text, None
        else:
            try:
                error_data = response.json()
                return False, error_data, f"HTTP {response.status_code}: {error_data.get('detail', 'Unknown error')}"
            except json.JSONDecodeError:
                return False, None, f"HTTP {response.status_code}: {response.text}"
    
    except requests.exceptions.Timeout:
        return False, None, f"Request timed out after {timeout} seconds"
    except requests.exceptions.ConnectionError:
        return False, None, "Connection error - server may be down"
    except Exception as e:
        return False, None, f"Unexpected error: {str(e)}"

def test_health_endpoint(test_result: TestResult):
    """Test GET /api/health"""
    success, data, error = make_request("GET", "/health")
    
    if success:
        if isinstance(data, dict) and data.get("status") == "healthy":
            llm_configured = data.get("llm_configured", False)
            test_result.add_test("/health", True, 
                               f"Server healthy, LLM configured: {llm_configured}", data)
        else:
            test_result.add_test("/health", False, 
                               f"Unexpected response format: {data}", data)
    else:
        test_result.add_test("/health", False, error or "Unknown error")

def test_genres_endpoint(test_result: TestResult):
    """Test GET /api/genres"""
    success, data, error = make_request("GET", "/genres")
    
    if success:
        if isinstance(data, dict) and "genres" in data:
            genres = data["genres"]
            if isinstance(genres, list) and len(genres) == 7:
                genre_ids = [g.get("id") for g in genres]
                expected_genres = {"action", "puzzle", "adventure", "arcade", "racing", "rpg", "shooter"}
                actual_genres = set(genre_ids)
                
                if actual_genres == expected_genres:
                    test_result.add_test("/genres", True, 
                                       f"All 7 expected genres found: {sorted(genre_ids)}", data)
                else:
                    missing = expected_genres - actual_genres
                    extra = actual_genres - expected_genres
                    test_result.add_test("/genres", False, 
                                       f"Genre mismatch. Missing: {missing}, Extra: {extra}", data)
            else:
                test_result.add_test("/genres", False, 
                                   f"Expected 7 genres, got {len(genres) if isinstance(genres, list) else 'invalid'}", data)
        else:
            test_result.add_test("/genres", False, 
                               f"Invalid response format. Expected dict with 'genres' key", data)
    else:
        test_result.add_test("/genres", False, error or "Unknown error")

def test_platforms_endpoint(test_result: TestResult):
    """Test GET /api/platforms"""
    success, data, error = make_request("GET", "/platforms")
    
    if success:
        if isinstance(data, dict) and "platforms" in data:
            platforms = data["platforms"]
            if isinstance(platforms, list) and len(platforms) == 3:
                platform_ids = [p.get("id") for p in platforms]
                expected_platforms = {"javascript", "unity", "unreal"}
                actual_platforms = set(platform_ids)
                
                if actual_platforms == expected_platforms:
                    test_result.add_test("/platforms", True, 
                                       f"All 3 expected platforms found: {sorted(platform_ids)}", data)
                else:
                    test_result.add_test("/platforms", False, 
                                       f"Platform mismatch. Expected: {expected_platforms}, Got: {actual_platforms}", data)
            else:
                test_result.add_test("/platforms", False, 
                                   f"Expected 3 platforms, got {len(platforms) if isinstance(platforms, list) else 'invalid'}", data)
        else:
            test_result.add_test("/platforms", False, 
                               f"Invalid response format. Expected dict with 'platforms' key", data)
    else:
        test_result.add_test("/platforms", False, error or "Unknown error")

def test_control_schemes_endpoint(test_result: TestResult):
    """Test GET /api/control-schemes"""
    success, data, error = make_request("GET", "/control-schemes")
    
    if success:
        if isinstance(data, dict) and "schemes" in data:
            schemes = data["schemes"]
            if isinstance(schemes, list) and len(schemes) == 2:
                scheme_ids = [s.get("id") for s in schemes]
                expected_schemes = {"dpad_buttons", "swipe"}
                actual_schemes = set(scheme_ids)
                
                if actual_schemes == expected_schemes:
                    test_result.add_test("/control-schemes", True, 
                                       f"Both expected control schemes found: {sorted(scheme_ids)}", data)
                else:
                    test_result.add_test("/control-schemes", False, 
                                       f"Control scheme mismatch. Expected: {expected_schemes}, Got: {actual_schemes}", data)
            else:
                test_result.add_test("/control-schemes", False, 
                                   f"Expected 2 control schemes, got {len(schemes) if isinstance(schemes, list) else 'invalid'}", data)
        else:
            test_result.add_test("/control-schemes", False, 
                               f"Invalid response format. Expected dict with 'schemes' key", data)
    else:
        test_result.add_test("/control-schemes", False, error or "Unknown error")

def test_game_generation(test_result: TestResult) -> Optional[str]:
    """Test POST /api/games/generate - Returns game_id if successful"""
    test_payload = {
        "prompt": "A retro platformer with pixel art style",
        "genre": "arcade",
        "character_description": "A small robot with jumping abilities",
        "control_scheme": "dpad_buttons",
        "target_platform": "javascript"
    }
    
    print(f"Testing game generation with AI (may take 10-20 seconds)...")
    success, data, error = make_request("POST", "/games/generate", test_payload, LONG_TIMEOUT)
    
    if success:
        if isinstance(data, dict) and data.get("success") is True:
            game = data.get("game")
            schema = data.get("schema")
            
            if game and isinstance(game, dict) and game.get("id"):
                game_id = game["id"]
                game_name = game.get("name", "Unknown")
                test_result.add_test("/games/generate", True, 
                                   f"Game generated successfully: '{game_name}' (ID: {game_id})", 
                                   {"game_id": game_id, "game_name": game_name, "has_schema": bool(schema)})
                return game_id
            else:
                test_result.add_test("/games/generate", False, 
                                   f"Game object missing or invalid: {game}", data)
        else:
            test_result.add_test("/games/generate", False, 
                               f"Expected success=true, got: {data.get('success') if isinstance(data, dict) else data}", data)
    else:
        test_result.add_test("/games/generate", False, error or "Unknown error")
    
    return None

def test_games_list(test_result: TestResult):
    """Test GET /api/games"""
    success, data, error = make_request("GET", "/games")
    
    if success:
        if isinstance(data, list):
            game_count = len(data)
            if game_count > 0:
                # Check if games have required fields
                sample_game = data[0]
                required_fields = ["id", "name", "genre", "created_at"]
                missing_fields = [field for field in required_fields if field not in sample_game]
                
                if not missing_fields:
                    test_result.add_test("/games", True, 
                                       f"Retrieved {game_count} games with valid structure", 
                                       {"game_count": game_count})
                else:
                    test_result.add_test("/games", False, 
                                       f"Games missing required fields: {missing_fields}", data)
            else:
                test_result.add_test("/games", True, "No games found (empty list is valid)", data)
        else:
            test_result.add_test("/games", False, 
                               f"Expected list of games, got: {type(data)}", data)
    else:
        test_result.add_test("/games", False, error or "Unknown error")

def test_code_generation(test_result: TestResult, game_id: str):
    """Test POST /api/games/{game_id}/generate-code"""
    if not game_id:
        test_result.add_test("/games/{id}/generate-code", False, 
                           "No valid game_id available from previous test")
        return
    
    endpoint = f"/games/{game_id}/generate-code"
    print(f"Testing code generation with AI for game {game_id} (may take 10-20 seconds)...")
    success, data, error = make_request("POST", endpoint, timeout=LONG_TIMEOUT)
    
    if success:
        if isinstance(data, dict) and data.get("success") is True:
            code = data.get("code")
            platform = data.get("platform")
            
            if code and isinstance(code, str) and len(code) > 100:  # Reasonable code length
                test_result.add_test(f"/games/{game_id}/generate-code", True, 
                                   f"Code generated successfully for {platform} platform ({len(code)} characters)", 
                                   {"platform": platform, "code_length": len(code)})
            else:
                test_result.add_test(f"/games/{game_id}/generate-code", False, 
                                   f"Generated code is too short or invalid: {len(code) if code else 0} characters", data)
        else:
            test_result.add_test(f"/games/{game_id}/generate-code", False, 
                               f"Expected success=true, got: {data.get('success') if isinstance(data, dict) else data}", data)
    else:
        test_result.add_test(f"/games/{game_id}/generate-code", False, error or "Unknown error")

def main():
    """Run all backend API tests"""
    print("="*60)
    print("STARTING BACKEND API TESTING")
    print(f"Base URL: {API_BASE}")
    print("="*60)
    
    test_result = TestResult()
    game_id = None
    
    # Run tests in order
    print("\n1. Testing health endpoint...")
    test_health_endpoint(test_result)
    
    print("\n2. Testing genres endpoint...")
    test_genres_endpoint(test_result)
    
    print("\n3. Testing platforms endpoint...")
    test_platforms_endpoint(test_result)
    
    print("\n4. Testing control schemes endpoint...")
    test_control_schemes_endpoint(test_result)
    
    print("\n5. Testing game generation (AI-powered)...")
    game_id = test_game_generation(test_result)
    
    print("\n6. Testing games list endpoint...")
    test_games_list(test_result)
    
    print("\n7. Testing code generation (AI-powered)...")
    test_code_generation(test_result, game_id)
    
    # Print final summary
    test_result.print_summary()
    
    # Exit with appropriate code
    if test_result.failed_tests > 0:
        print(f"\n❌ {test_result.failed_tests} test(s) failed. See details above.")
        sys.exit(1)
    else:
        print(f"\n✅ All {test_result.passed_tests} tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()