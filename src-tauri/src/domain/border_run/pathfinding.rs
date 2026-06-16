//! Breadth-first shortest-path queries over the adjacency [`Graph`].
//! Lengths are measured in edges (border crossings). Pure: no I/O.

use std::collections::{HashMap, HashSet, VecDeque};

use super::graph::Graph;

/// BFS distances (in edges) from `from` to every reachable country,
/// including `from` itself at distance 0. Empty if `from` is not a node.
pub fn distances_from(graph: &Graph, from: &str) -> HashMap<String, usize> {
    let mut distances: HashMap<String, usize> = HashMap::new();
    if !graph.contains(from) {
        return distances;
    }
    distances.insert(from.to_string(), 0);
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(from.to_string());
    while let Some(node) = queue.pop_front() {
        let next_distance = distances[&node] + 1;
        for neighbor in graph.neighbors(&node) {
            if !distances.contains_key(neighbor) {
                distances.insert(neighbor.clone(), next_distance);
                queue.push_back(neighbor.clone());
            }
        }
    }
    distances
}

/// Shortest-path length in edges between `from` and `to`, or `None` when no
/// land path exists. Adjacent countries are `1`; identical endpoints are `0`.
pub fn shortest_path_length(graph: &Graph, from: &str, to: &str) -> Option<usize> {
    if from == to {
        return graph.contains(from).then_some(0);
    }
    distances_from(graph, from).get(to).copied()
}

/// One shortest path from `from` to `to`, as an ordered list of countries
/// including both endpoints, or `None` when no land path exists. Used to
/// reveal a solution on the lose screen.
pub fn shortest_path(graph: &Graph, from: &str, to: &str) -> Option<Vec<String>> {
    if !graph.contains(from) || !graph.contains(to) {
        return None;
    }
    if from == to {
        return Some(vec![from.to_string()]);
    }
    let mut predecessor: HashMap<String, String> = HashMap::new();
    let mut visited: HashSet<String> = HashSet::new();
    visited.insert(from.to_string());
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(from.to_string());
    while let Some(node) = queue.pop_front() {
        for neighbor in graph.neighbors(&node) {
            if visited.insert(neighbor.clone()) {
                predecessor.insert(neighbor.clone(), node.clone());
                if neighbor == to {
                    let mut path = vec![to.to_string()];
                    let mut current = to.to_string();
                    while let Some(parent) = predecessor.get(&current) {
                        path.push(parent.clone());
                        current = parent.clone();
                    }
                    path.reverse();
                    return Some(path);
                }
                queue.push_back(neighbor.clone());
            }
        }
    }
    None
}

/// The set of every country lying on *any* shortest path between `from` and
/// `to`, including both endpoints. Empty when no path exists.
///
/// Runs a BFS that records all equal-distance predecessors of each node,
/// then backtracks from `to` to collect every node reachable through those
/// predecessor links (used to classify on-path green vs. detour orange).
pub fn all_shortest_paths(graph: &Graph, from: &str, to: &str) -> HashSet<String> {
    let mut on_path: HashSet<String> = HashSet::new();
    if !graph.contains(from) || !graph.contains(to) {
        return on_path;
    }
    if from == to {
        on_path.insert(from.to_string());
        return on_path;
    }

    let mut distances: HashMap<String, usize> = HashMap::new();
    let mut predecessors: HashMap<String, Vec<String>> = HashMap::new();
    distances.insert(from.to_string(), 0);
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(from.to_string());
    while let Some(node) = queue.pop_front() {
        let next_distance = distances[&node] + 1;
        for neighbor in graph.neighbors(&node) {
            match distances.get(neighbor) {
                None => {
                    distances.insert(neighbor.clone(), next_distance);
                    predecessors
                        .entry(neighbor.clone())
                        .or_default()
                        .push(node.clone());
                    queue.push_back(neighbor.clone());
                }
                Some(&existing) if existing == next_distance => {
                    predecessors
                        .entry(neighbor.clone())
                        .or_default()
                        .push(node.clone());
                }
                Some(_) => {}
            }
        }
    }

    if !distances.contains_key(to) {
        return on_path;
    }

    let mut stack = vec![to.to_string()];
    while let Some(node) = stack.pop() {
        if !on_path.insert(node.clone()) {
            continue;
        }
        if let Some(parents) = predecessors.get(&node) {
            for parent in parents {
                stack.push(parent.clone());
            }
        }
    }
    on_path
}
