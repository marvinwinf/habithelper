import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import CategoryListScreen from '../index';
import { listCategories } from '../../../src/data/repositories/categoryRepository';
import { CategoryHasReferencesError, deleteCategory } from '../../../src/services/categoryService';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('../../../src/data/db/client', () => ({ db: {} }));
jest.mock('../../../src/data/repositories/categoryRepository', () => ({
  listCategories: jest.fn(),
}));
jest.mock('../../../src/services/categoryService', () => ({
  ...jest.requireActual('../../../src/services/categoryService'),
  deleteCategory: jest.fn(),
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(callback, [callback]),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const sport = { id: 'cat-1', name: 'Sport', baseColor: '#8FBFA0', createdAt: 'x', updatedAt: 'x' };
const haushalt = { id: 'cat-2', name: 'Haushalt', baseColor: '#A9A0D6', createdAt: 'x', updatedAt: 'x' };

async function pressAlertButton(buttonText: string) {
  const alertCall = (Alert.alert as jest.Mock).mock.calls.at(-1);
  const buttons = alertCall[2] as { text: string; onPress?: () => void }[];
  const button = buttons.find((b) => b.text === buttonText);
  await act(async () => {
    await button?.onPress?.();
  });
}

/** Opens the actions sheet for a category row (List Row Actions pattern). */
async function openRowSheet(categoryId: string) {
  await fireEvent.press(screen.getByTestId(`category-row-${categoryId}`));
}

describe('CategoryListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('renders categories returned by the repository', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport, haushalt]);
    await render(<CategoryListScreen />);

    expect(await screen.findByText('Sport')).toBeTruthy();
    expect(screen.getByText('Haushalt')).toBeTruthy();
  });

  it('shows an empty state when there are no categories', async () => {
    (listCategories as jest.Mock).mockResolvedValue([]);
    await render(<CategoryListScreen />);

    expect(await screen.findByText('Noch keine Kategorien')).toBeTruthy();
  });

  it('carries no inline row actions — edit and delete live in the row sheet', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    expect(screen.queryByTestId('category-edit-button-cat-1')).toBeNull();
    expect(screen.queryByTestId('category-delete-button-cat-1')).toBeNull();

    await openRowSheet('cat-1');

    expect(screen.getByTestId('category-edit-button-cat-1')).toBeTruthy();
    expect(screen.getByTestId('category-delete-button-cat-1')).toBeTruthy();
  });

  it('navigates to the edit screen once the sheet has dismissed', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await openRowSheet('cat-1');
    await fireEvent.press(screen.getByTestId('category-edit-button-cat-1'));

    // Navigation is sequenced after the sheet's exit animation.
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/category/cat-1/edit'));
  });

  it('navigates to the create screen from the footer button', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await fireEvent.press(screen.getByTestId('category-list-create-button'));

    expect(mockPush).toHaveBeenCalledWith('/category/create');
  });

  it('shows a confirmation dialog before deleting, and does not delete until confirmed', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    (deleteCategory as jest.Mock).mockResolvedValue(undefined);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await openRowSheet('cat-1');
    await fireEvent.press(screen.getByTestId('category-delete-button-cat-1'));

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(deleteCategory).not.toHaveBeenCalled();

    await pressAlertButton('Löschen');

    expect(deleteCategory).toHaveBeenCalledWith({}, 'cat-1');
  });

  it('does not delete when the confirmation is cancelled', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await openRowSheet('cat-1');
    await fireEvent.press(screen.getByTestId('category-delete-button-cat-1'));
    await pressAlertButton('Abbrechen');

    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it('shows an in-use message instead of crashing when the category is still referenced', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    (deleteCategory as jest.Mock).mockRejectedValue(new CategoryHasReferencesError('cat-1'));
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await openRowSheet('cat-1');
    await fireEvent.press(screen.getByTestId('category-delete-button-cat-1'));
    await pressAlertButton('Löschen');

    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(Alert.alert).toHaveBeenLastCalledWith('Kategorie in Verwendung', expect.any(String));
  });
});
