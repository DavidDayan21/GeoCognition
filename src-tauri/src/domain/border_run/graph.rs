//! Undirected adjacency graph over countries, built from the `borders`
//! field of the bundled dataset. Pure: no I/O, no clock.

use std::collections::{HashMap, HashSet, VecDeque};

use crate::domain::models::Country;

/// Land-border adjacency between countries, keyed by ISO alpha-3 code.
///
/// Every country in the source list is a node, even island nations with no
/// borders. Edges are stored symmetrically: if `a` lists `b` (or vice
/// versa), both directions are present. Neighbor lists are sorted for a
/// stable iteration order.
pub struct Graph {
    adjacency: HashMap<String, Vec<String>>,
}

impl Graph {
    /// Builds the graph from a country list. Borders pointing to codes not
    /// present in the list are ignored, and edges are forced symmetric so a
    /// one-sided `borders` entry still yields a usable undirected edge.
    pub fn from_countries(countries: &[Country]) -> Graph {
        let known: HashSet<&str> = countries.iter().map(|c| c.iso_alpha3.as_str()).collect();
        let mut sets: HashMap<String, HashSet<String>> = HashMap::new();
        for country in countries {
            sets.entry(country.iso_alpha3.clone()).or_default();
        }
        for country in countries {
            for border in &country.borders {
                if border == &country.iso_alpha3 || !known.contains(border.as_str()) {
                    continue;
                }
                sets.entry(country.iso_alpha3.clone())
                    .or_default()
                    .insert(border.clone());
                sets.entry(border.clone())
                    .or_default()
                    .insert(country.iso_alpha3.clone());
            }
        }
        let adjacency = sets
            .into_iter()
            .map(|(iso, neighbors)| {
                let mut neighbors: Vec<String> = neighbors.into_iter().collect();
                neighbors.sort();
                (iso, neighbors)
            })
            .collect();
        Graph { adjacency }
    }

    /// True if `iso3` is a node in the graph.
    pub fn contains(&self, iso3: &str) -> bool {
        self.adjacency.contains_key(iso3)
    }

    /// Number of countries in the graph.
    pub fn len(&self) -> usize {
        self.adjacency.len()
    }

    /// True when the graph has no nodes.
    pub fn is_empty(&self) -> bool {
        self.adjacency.is_empty()
    }

    /// Every ISO alpha-3 code in the graph, in no particular order.
    pub fn iso_codes(&self) -> impl Iterator<Item = &str> {
        self.adjacency.keys().map(|s| s.as_str())
    }

    /// The countries directly bordering `iso3` (empty if unknown or
    /// landlocked-from-the-set / island).
    pub fn neighbors(&self, iso3: &str) -> &[String] {
        self.adjacency.get(iso3).map_or(&[], |n| n.as_slice())
    }

    /// True if `a` and `b` share a land border.
    pub fn is_adjacent(&self, a: &str, b: &str) -> bool {
        self.neighbors(a).iter().any(|n| n == b)
    }

    /// True if any land path connects `a` and `b` (same country counts as
    /// connected). Used to exclude ocean-separated pairs from the generator.
    pub fn has_path(&self, a: &str, b: &str) -> bool {
        if !self.contains(a) || !self.contains(b) {
            return false;
        }
        if a == b {
            return true;
        }
        let mut visited: HashSet<&str> = HashSet::new();
        visited.insert(a);
        let mut queue: VecDeque<&str> = VecDeque::new();
        queue.push_back(a);
        while let Some(node) = queue.pop_front() {
            for neighbor in self.neighbors(node) {
                if neighbor == b {
                    return true;
                }
                if visited.insert(neighbor.as_str()) {
                    queue.push_back(neighbor.as_str());
                }
            }
        }
        false
    }
}
