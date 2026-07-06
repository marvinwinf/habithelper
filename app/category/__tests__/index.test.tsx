import { Alert } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import CategoryListScreen from '../index';
import { listCategories } from '../../../src/data/repositories/categoryRepository';
import { CategoryHasReferencesError, deleteCategory } from '../../../src/services/categoryService';

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

  it('shows a confirmation dialog before deleting, and does not delete until confirmed', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    (deleteCategory as jest.Mock).mockResolvedValue(undefined);
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

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

    await fireEvent.press(screen.getByTestId('category-delete-button-cat-1'));
    await pressAlertButton('Abbrechen');

    expect(deleteCategory).not.toHaveBeenCalled();
  });

  it('shows an in-use message instead of crashing when the category is still referenced', async () => {
    (listCategories as jest.Mock).mockResolvedValue([sport]);
    (deleteCategory as jest.Mock).mockRejectedValue(new CategoryHasReferencesError('cat-1'));
    await render(<CategoryListScreen />);
    await screen.findByText('Sport');

    await fireEvent.press(screen.getByTestId('category-delete-button-cat-1'));
    await pressAlertButton('Löschen');

    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(Alert.alert).toHaveBeenLastCalledWith('Kategorie in Verwendung', expect.any(String));
  });
});
