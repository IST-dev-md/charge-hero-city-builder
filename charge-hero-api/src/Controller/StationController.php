<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\StationStatus;
use App\Repository\StationRepository;
use App\Service\StationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[Route('/api/stations')]
final class StationController extends AbstractController
{
    public function __construct(
    private StationService $service,
    private StationRepository $repo,
    private HttpClientInterface $httpClient,
    private string $wsBridgeUrl,
    ) {}
    
    #[Route('', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return $this->json($this->repo->all());
    }

    #[Route('/{id}', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $station = $this->repo->find($id);
        if (!$station) {
            return $this->json(['message' => 'Station not found'], 404);
        }

        return $this->json($station);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode((string) $request->getContent(), true) ?? [];

        $name = trim((string) ($data['name'] ?? ''));
        $x = (int) ($data['x'] ?? 0);
        $y = (int) ($data['y'] ?? 0);

        if ($name === '') {
            return $this->json(['message' => 'name is required'], 422);
        }

        if ($this->repo->existsByName($name)) {
            return $this->json(['message' => 'name already exists'], 409);
        }

        $station = $this->service->create($name, $x, $y);

        $this->broadcast([
            'type' => 'station_created',
            'payload' => $station,
        ]);

        return $this->json($station, 201);
    }

    #[Route('/{id}', methods: ['PUT', 'PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $station = $this->repo->find($id);
        if (!$station) {
            return $this->json(['message' => 'Station not found'], 404);
        }

        $data = json_decode((string) $request->getContent(), true) ?? [];

        if (array_key_exists('name', $data)) {
            $newName = trim((string) $data['name']);
            if ($newName === '') {
                return $this->json(['message' => 'name cannot be empty'], 422);
            }
            if ($newName !== $station->name && $this->repo->existsByName($newName)) {
                return $this->json(['message' => 'name already exists'], 409);
            }
            $station->name = $newName;
        }

        if (array_key_exists('x', $data)) {
            $station->x = (int) $data['x'];
        }
        if (array_key_exists('y', $data)) {
            $station->y = (int) $data['y'];
        }
        if (array_key_exists('status', $data)) {
            try {
                $station->status = StationStatus::from((string) $data['status']);
            } catch (\Throwable) {
                return $this->json(['message' => 'invalid status'], 422);
            }
        }

        $this->repo->save($station);

        $this->broadcast([
            'type' => 'station_updated',
            'payload' => $station,
        ]);

        return $this->json($station);
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        $station = $this->repo->find($id);
        if (!$station) {
            return $this->json(['message' => 'Station not found'], 404);
        }

        $this->repo->delete($id);

        $this->broadcast([
            'type' => 'station_deleted',
            'payload' => ['id' => $id],
        ]);

        return $this->json(null, 204);
    }

    #[Route('/simulate', methods: ['POST'])]
    public function simulate(): JsonResponse
    {
        $stations = $this->service->simulate();

$stationsArray = array_values($stations);

$this->broadcast([
    'type' => 'stations_simulated',
    'payload' => $stationsArray,
]);

return $this->json($stationsArray);

    }

    #[Route('/reset', methods: ['POST'])]
    public function reset(): JsonResponse
    {
        $this->repo->clear();

        $this->broadcast([
            'type' => 'stations_simulated',
            'payload' => [],
        ]);

        return $this->json(['message' => 'All stations cleared']);
    }

    private function broadcast(array $data): void
    {
        try {
            $this->httpClient->request('POST', $this->wsBridgeUrl, [
                'json' => $data,
                'timeout' => 1.0,
            ]);
        } catch (\Throwable) {
            // Silent fail: WS down should not break API
        }
    }
}