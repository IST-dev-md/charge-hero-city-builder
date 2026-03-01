<?php

declare(strict_types=1);

namespace App\Tests\Functional\Controller;

use App\Entity\StationStatus;
use App\Repository\StationRepository;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Functional tests for StationController.
 *
 * Design notes:
 *  - HttpClientInterface is replaced with a PHPUnit mock so broadcast() never
 *    tries to reach the real WS bridge (avoids 1 s timeout per request).
 *  - StationRepository is fetched from the test container (same singleton the
 *    controller uses) so we can assert on storage state without extra HTTP calls.
 *  - setUp() calls clear() before every test for full isolation.
 */
class StationControllerTest extends WebTestCase
{
    private KernelBrowser $client;
    private StationRepository $repository;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        // Replace the HTTP client before any request — the test container allows
        // overriding private services by their autowiring alias.
        $mockResponse   = $this->createMock(ResponseInterface::class);
        $mockHttpClient = $this->createMock(HttpClientInterface::class);
        $mockHttpClient->method('request')->willReturn($mockResponse);
        static::getContainer()->set(HttpClientInterface::class, $mockHttpClient);

        // Same singleton the controller uses, so writes are immediately visible here.
        $this->repository = static::getContainer()->get(StationRepository::class);
        $this->repository->clear();
    }

    // -------------------------------------------------------------------------
    // GET /api/stations
    // -------------------------------------------------------------------------

    public function test_list_returns_200_with_empty_result_when_no_stations(): void
    {
        // Act
        $this->client->request('GET', '/api/stations');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertSame([], $data);
    }

    public function test_list_returns_all_existing_stations(): void
    {
        // Arrange
        $this->createStationViaApi('Alpha');
        $this->createStationViaApi('Beta');

        // Act
        $this->client->request('GET', '/api/stations');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertCount(2, $data);
    }

    // -------------------------------------------------------------------------
    // GET /api/stations/{id}
    // -------------------------------------------------------------------------

    public function test_show_returns_station_data_for_existing_id(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha', 10, 20);

        // Act
        $this->client->request('GET', '/api/stations/' . $station['id']);
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertSame($station['id'], $data['id']);
        $this->assertSame('Alpha',        $data['name']);
        $this->assertSame(10,             $data['x']);
        $this->assertSame(20,             $data['y']);
    }

    public function test_show_returns_404_for_unknown_id(): void
    {
        // Act
        $this->client->request('GET', '/api/stations/nonexistent-id');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(404);
        $this->assertSame('Station not found', $data['message']);
    }

    // -------------------------------------------------------------------------
    // POST /api/stations
    // -------------------------------------------------------------------------

    public function test_create_returns_201_with_station_payload(): void
    {
        // Act
        $this->postJson('/api/stations', ['name' => 'Alpha', 'x' => 10, 'y' => 20]);
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(201);
        $this->assertSame('Alpha',     $data['name']);
        $this->assertSame(10,          $data['x']);
        $this->assertSame(20,          $data['y']);
        $this->assertSame('available', $data['status']);
        $this->assertArrayHasKey('id', $data);
    }

    public function test_create_returns_422_when_name_is_empty(): void
    {
        // Act
        $this->postJson('/api/stations', ['name' => '']);
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(422);
        $this->assertSame('name is required', $data['message']);
    }

    public function test_create_returns_422_when_name_is_whitespace_only(): void
    {
        // Act
        $this->postJson('/api/stations', ['name' => '   ']);

        // Assert
        $this->assertResponseStatusCodeSame(422);
    }

    public function test_create_returns_422_when_name_field_is_absent(): void
    {
        // Act
        $this->postJson('/api/stations', ['x' => 0, 'y' => 0]);

        // Assert
        $this->assertResponseStatusCodeSame(422);
    }

    public function test_create_returns_409_when_name_already_exists(): void
    {
        // Arrange
        $this->createStationViaApi('Alpha');

        // Act
        $this->postJson('/api/stations', ['name' => 'Alpha']);
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(409);
        $this->assertSame('name already exists', $data['message']);
    }

    // -------------------------------------------------------------------------
    // PATCH /api/stations/{id}
    // -------------------------------------------------------------------------

    public function test_update_modifies_station_name(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act
        $this->postJson('/api/stations/' . $station['id'], ['name' => 'NewName'], 'PATCH');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertSame('NewName', $data['name']);
    }

    public function test_update_returns_404_for_unknown_station(): void
    {
        // Act
        $this->postJson('/api/stations/nonexistent', ['name' => 'X'], 'PATCH');

        // Assert
        $this->assertResponseStatusCodeSame(404);
    }

    public function test_update_returns_422_when_name_is_empty(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act
        $this->postJson('/api/stations/' . $station['id'], ['name' => ''], 'PATCH');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(422);
        $this->assertSame('name cannot be empty', $data['message']);
    }

    public function test_update_returns_409_when_name_belongs_to_another_station(): void
    {
        // Arrange
        $station1 = $this->createStationViaApi('Alpha');
        $this->createStationViaApi('Beta');

        // Act — try to rename Alpha → Beta (already taken by another station)
        $this->postJson('/api/stations/' . $station1['id'], ['name' => 'Beta'], 'PATCH');

        // Assert
        $this->assertResponseStatusCodeSame(409);
    }

    public function test_update_with_same_name_does_not_conflict(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act — keeping the same name should be idempotent
        $this->postJson('/api/stations/' . $station['id'], ['name' => 'Alpha'], 'PATCH');

        // Assert
        $this->assertResponseIsSuccessful();
    }

    public function test_update_returns_422_for_invalid_status_value(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act
        $this->postJson('/api/stations/' . $station['id'], ['status' => 'broken'], 'PATCH');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseStatusCodeSame(422);
        $this->assertSame('invalid status', $data['message']);
    }

    public function test_update_accepts_every_valid_status_value(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        foreach (StationStatus::cases() as $status) {
            // Act
            $this->postJson('/api/stations/' . $station['id'], ['status' => $status->value], 'PATCH');
            $data = $this->decodeResponse();

            // Assert
            $this->assertResponseIsSuccessful();
            $this->assertSame($status->value, $data['status']);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /api/stations/{id}
    // -------------------------------------------------------------------------

    public function test_delete_returns_204_no_content(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act
        $this->client->request('DELETE', '/api/stations/' . $station['id']);

        // Assert
        $this->assertResponseStatusCodeSame(204);
    }

    public function test_delete_actually_removes_the_station_from_storage(): void
    {
        // Arrange
        $station = $this->createStationViaApi('Alpha');

        // Act
        $this->client->request('DELETE', '/api/stations/' . $station['id']);

        // Assert — subsequent GET must 404
        $this->client->request('GET', '/api/stations/' . $station['id']);
        $this->assertResponseStatusCodeSame(404);
    }

    public function test_delete_returns_404_for_unknown_station(): void
    {
        // Act
        $this->client->request('DELETE', '/api/stations/nonexistent-id');

        // Assert
        $this->assertResponseStatusCodeSame(404);
    }

    // -------------------------------------------------------------------------
    // POST /api/stations/simulate
    // -------------------------------------------------------------------------

    public function test_simulate_returns_array_with_valid_statuses_for_all_stations(): void
    {
        // Arrange
        $this->createStationViaApi('Alpha');
        $this->createStationViaApi('Beta');
        $validValues = array_map(static fn(StationStatus $s) => $s->value, StationStatus::cases());

        // Act
        $this->client->request('POST', '/api/stations/simulate');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertCount(2, $data);
        foreach ($data as $item) {
            $this->assertContains($item['status'], $validValues);
        }
    }

    public function test_simulate_actually_persists_updated_statuses_in_storage(): void
    {
        // Arrange
        $this->createStationViaApi('Alpha');

        // Act
        $this->client->request('POST', '/api/stations/simulate');
        $this->assertResponseIsSuccessful();

        // Assert — the mutation must be durable, not just present in the HTTP response
        $stations = array_values($this->repository->all());
        $this->assertCount(1, $stations);
        $this->assertContains($stations[0]->status, StationStatus::cases());
    }

    public function test_simulate_with_no_stations_returns_empty_array(): void
    {
        // Act
        $this->client->request('POST', '/api/stations/simulate');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertSame([], $data);
    }

    // -------------------------------------------------------------------------
    // POST /api/stations/reset
    // -------------------------------------------------------------------------

    public function test_reset_removes_all_stations_from_storage(): void
    {
        // Arrange
        $this->createStationViaApi('Alpha');
        $this->createStationViaApi('Beta');

        // Act
        $this->client->request('POST', '/api/stations/reset');
        $this->assertResponseIsSuccessful();

        // Assert
        $this->assertCount(0, $this->repository->all());
    }

    public function test_reset_returns_a_success_message(): void
    {
        // Act
        $this->client->request('POST', '/api/stations/reset');
        $data = $this->decodeResponse();

        // Assert
        $this->assertResponseIsSuccessful();
        $this->assertArrayHasKey('message', $data);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Creates a station via the API and returns the decoded response body.
     * Subsequent calls to $this->client->getResponse() will return the NEXT
     * response made in the test, not this one — by design.
     */
    private function createStationViaApi(string $name, int $x = 0, int $y = 0): array
    {
        $this->postJson('/api/stations', ['name' => $name, 'x' => $x, 'y' => $y]);

        return $this->decodeResponse();
    }

    private function postJson(string $url, array $payload, string $method = 'POST'): void
    {
        $this->client->request(
            $method,
            $url,
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            (string) json_encode($payload)
        );
    }

    private function decodeResponse(): mixed
    {
        return json_decode((string) $this->client->getResponse()->getContent(), true);
    }
}
